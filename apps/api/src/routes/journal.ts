import { Router } from 'express';
import { z } from 'zod';
import { LOG_MODES, SPARK_RULES, type RealityLog } from '@real/types';
import { buildMoodTimeline, calcCheckInSparks, todayISO } from '@real/utils';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { earn } from '../services/spark.service.js';
import { applyCheckInToStreak } from '../services/streak.service.js';

export const journalRouter = Router();
journalRouter.use(requireAuth, requireCouple);

const checkInSchema = z.object({
  mood_score: z.number().int().min(1).max(5),
  entry_text: z.string().max(5000).optional(),
  shared_text: z.string().max(5000).optional(),
  mode: z.enum(LOG_MODES).default('private'),
  promise_made: z.string().max(280).optional(),
  promise_kept: z.boolean().optional(),
});

/**
 * POST /journal/checkin — the daily heartbeat of the whole app.
 *
 * One per person per day (enforced by a unique index). Awards Sparks,
 * advances the couple streak, and pays the weekly streak bonus.
 */
journalRouter.post(
  '/checkin',
  validate(checkInSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const body = req.body as z.infer<typeof checkInSchema>;
    const logDate = todayISO();

    const { data: existing } = await db
      .from('reality_logs')
      .select('id')
      .eq('user_id', me.id)
      .eq('log_date', logDate)
      .maybeSingle();

    if (existing) {
      throw new AppError(
        'ALREADY_LOGGED_TODAY',
        'You already checked in today. Come back tomorrow.',
        409
      );
    }

    // Streak first — the bonus depends on the new count.
    const streak = await applyCheckInToStreak(couple, logDate);

    const breakdown = calcCheckInSparks({
      mode: body.mode,
      hasSharedText: Boolean(body.shared_text?.trim()),
      promiseKept: body.promise_kept,
      streakCount: streak.streak_count,
    });

    const { data: log, error } = await db
      .from('reality_logs')
      .insert({
        user_id: me.id,
        couple_id: couple.id,
        log_date: logDate,
        mood_score: body.mood_score,
        entry_text: body.entry_text ?? null,
        shared_text: body.shared_text ?? null,
        mode: body.mode,
        promise_made: body.promise_made ?? null,
        promise_kept: body.promise_kept ?? null,
        sparks_awarded: breakdown.total,
      })
      .select('*')
      .single<RealityLog>();

    if (error) throw fromPostgrest(error);

    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: breakdown.base + breakdown.shared_bonus + breakdown.promise_bonus,
      source: 'daily_checkin',
      sourceId: log.id,
      note: `Check-in ${logDate}`,
    });

    if (breakdown.streak_bonus > 0) {
      await earn({
        userId: me.id,
        coupleId: couple.id,
        amount: breakdown.streak_bonus,
        source: 'streak_bonus',
        sourceId: log.id,
        note: `${streak.streak_count}-day streak`,
      });
    }

    created(res, {
      log,
      sparks: breakdown,
      streak: {
        current: streak.streak_count,
        longest: streak.longest_streak,
        continued: streak.continued,
        broken: streak.broken,
      },
      rules: SPARK_RULES,
    });
  })
);

/** GET /journal/today — did I check in yet, and how is my partner doing? */
journalRouter.get(
  '/today',
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const today = todayISO();

    const { data, error } = await db
      .from('reality_logs')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('log_date', today)
      .returns<RealityLog[]>();

    if (error) throw fromPostgrest(error);

    const logs = data ?? [];
    const mine = logs.find((l) => l.user_id === me.id) ?? null;
    const partnerLog = logs.find((l) => l.user_id !== me.id) ?? null;

    ok(res, {
      mine,
      // Never leak a private entry — only what they chose to share.
      partner: partnerLog
        ? {
            mood_score: partnerLog.mood_score,
            shared_text: partnerLog.mode === 'shared' ? partnerLog.shared_text : null,
            promise_made: partnerLog.mode === 'shared' ? partnerLog.promise_made : null,
            checked_in: true,
          }
        : { checked_in: false },
    });
  })
);

/** GET /journal — my own history. Private entries never cross the wire to a partner. */
journalRouter.get(
  '/',
  validate(
    z.object({
      limit: z.coerce.number().int().min(1).max(200).default(60),
    }),
    'query'
  ),
  handler(async (req, res) => {
    const me = currentUser(req);
    const { limit } = req.query as unknown as { limit: number };

    const { data, error } = await db
      .from('reality_logs')
      .select('*')
      .eq('user_id', me.id)
      .order('log_date', { ascending: false })
      .limit(limit)
      .returns<RealityLog[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

/** GET /journal/mood — merged mood timeline for the sync chart. */
journalRouter.get(
  '/mood',
  validate(z.object({ days: z.coerce.number().int().min(7).max(180).default(30) }), 'query'),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const { days } = req.query as unknown as { days: number };

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await db
      .from('reality_logs')
      .select('log_date, mood_score, user_id')
      .eq('couple_id', couple.id)
      .gte('log_date', since)
      .order('log_date', { ascending: true })
      .returns<Array<{ log_date: string; mood_score: number; user_id: string }>>();

    if (error) throw fromPostgrest(error);
    ok(res, buildMoodTimeline(data ?? [], me.id));
  })
);

/** PATCH /journal/:id/promise — close the loop on yesterday's promise. */
journalRouter.patch(
  '/:id/promise',
  validate(z.object({ promise_kept: z.boolean() })),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const id = req.params.id as string;
    const { promise_kept } = req.body as { promise_kept: boolean };

    const { data: log, error } = await db
      .from('reality_logs')
      .update({ promise_kept })
      .eq('id', id)
      .eq('user_id', me.id)
      .select('*')
      .maybeSingle<RealityLog>();

    if (error) throw fromPostgrest(error);
    if (!log) throw AppError.notFound('No such entry.');

    if (promise_kept) {
      await earn({
        userId: me.id,
        coupleId: couple.id,
        amount: SPARK_RULES.PROMISE_KEPT,
        source: 'promise_kept',
        sourceId: log.id,
        note: 'Promise kept',
      });
    }

    ok(res, log);
  })
);
