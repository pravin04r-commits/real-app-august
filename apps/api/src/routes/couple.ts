import { Router } from 'express';
import { z } from 'zod';
import {
  DISTANCE_TYPES,
  RELATIONSHIP_TYPES,
  type Couple,
  type Dare,
  type Milestone,
  type Mission,
  type RealityLog,
  type UniverseSnapshot,
} from '@real/types';
import { daysTogether, nextAnniversary, todayISO } from '@real/utils';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { handler, created, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import {
  inviteExpiry,
  joinByInviteCode,
  membersOf,
  mintInviteCode,
  seedAutoMilestones,
} from '../services/couple.service.js';
import { getActiveDare } from '../services/dare.service.js';

export const coupleRouter = Router();
coupleRouter.use(requireAuth);

const aestheticSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #FF2D6B'),
  vibe: z.string().max(40),
  emoji: z.string().max(8),
});

const createCoupleSchema = z.object({
  ship_name: z.string().trim().min(2).max(40),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  relationship_type: z.enum(RELATIONSHIP_TYPES),
  distance_type: z.enum(DISTANCE_TYPES),
  how_we_met: z.string().max(2000).optional(),
  aesthetic: aestheticSchema.optional(),
});

/**
 * POST /couple — create a space and mint an invite code.
 * The creator becomes partner one. Exactly one seat remains.
 */
coupleRouter.post(
  '/',
  validate(createCoupleSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    if (me.couple_id) {
      throw new AppError('ALREADY_PAIRED', 'You already have a couple space.', 409);
    }

    const body = req.body as z.infer<typeof createCoupleSchema>;
    const invite_code = await mintInviteCode();

    const { data: couple, error } = await db
      .from('couples')
      .insert({
        ship_name: body.ship_name,
        start_date: body.start_date,
        relationship_type: body.relationship_type,
        distance_type: body.distance_type,
        how_we_met: body.how_we_met ?? null,
        aesthetic: body.aesthetic ?? undefined,
        invite_code,
        invite_expires_at: inviteExpiry(),
      })
      .select('*')
      .single<Couple>();

    if (error) throw fromPostgrest(error);

    const { error: linkError } = await db
      .from('users')
      .update({ couple_id: couple.id })
      .eq('id', me.id);

    if (linkError) throw fromPostgrest(linkError);

    await seedAutoMilestones(couple);
    created(res, couple);
  })
);

/** POST /couple/join — claim the second seat with an invite code. */
coupleRouter.post(
  '/join',
  validate(z.object({ invite_code: z.string().trim().min(4).max(12) })),
  handler(async (req, res) => {
    const me = currentUser(req);
    const raw = (req.body as { invite_code: string }).invite_code
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const couple = await joinByInviteCode(me, raw);
    ok(res, couple);
  })
);

/** POST /couple/invite/refresh — new code, 48h clock, only while a seat is free. */
coupleRouter.post(
  '/invite/refresh',
  requireCouple,
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const members = await membersOf(couple.id);

    if (members.length >= 2) {
      throw new AppError('COUPLE_FULL', 'Both seats are taken. No invite needed.', 409);
    }

    const invite_code = await mintInviteCode();
    const { data, error } = await db
      .from('couples')
      .update({ invite_code, invite_expires_at: inviteExpiry() })
      .eq('id', couple.id)
      .select('*')
      .single<Couple>();

    if (error) throw fromPostgrest(error);
    ok(res, data);
  })
);

const updateCoupleSchema = z.object({
  ship_name: z.string().trim().min(2).max(40).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relationship_type: z.enum(RELATIONSHIP_TYPES).optional(),
  distance_type: z.enum(DISTANCE_TYPES).optional(),
  how_we_met: z.string().max(2000).nullable().optional(),
  is_public: z.boolean().optional(),
  aesthetic: aestheticSchema.optional(),
});

/** PATCH /couple — either partner may edit the shared space. */
coupleRouter.patch(
  '/',
  requireCouple,
  validate(updateCoupleSchema),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('couples')
      .update(req.body as Record<string, unknown>)
      .eq('id', couple.id)
      .select('*')
      .single<Couple>();

    if (error) throw fromPostgrest(error);
    ok(res, data);
  })
);

/** GET /couple — the space plus both partners. */
coupleRouter.get(
  '/',
  requireCouple,
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const members = await membersOf(couple.id);
    ok(res, { couple, members });
  })
);

/**
 * GET /couple/universe — one payload for the whole dashboard.
 * Deliberately a single round trip: the Universe screen is the
 * first thing they see and it must land instantly.
 */
coupleRouter.get(
  '/universe',
  requireCouple,
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const partner = req.partner ?? null;
    const today = todayISO();

    const [todayLogs, milestones, missions, activeDare] = await Promise.all([
      db
        .from('reality_logs')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('log_date', today)
        .returns<RealityLog[]>(),
      db
        .from('milestones')
        .select('*')
        .eq('couple_id', couple.id)
        .order('milestone_date', { ascending: false })
        .limit(5)
        .returns<Milestone[]>(),
      db
        .from('missions')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .returns<Mission[]>(),
      getActiveDare(couple.id) as Promise<Dare | null>,
    ]);

    const logs = todayLogs.data ?? [];
    const myLog = logs.find((l) => l.user_id === me.id) ?? null;
    const partnerLog = partner ? logs.find((l) => l.user_id === partner.id) ?? null : null;

    const snapshot: UniverseSnapshot = {
      couple,
      me,
      partner,
      days_together: daysTogether(couple.start_date),
      next_anniversary: nextAnniversary(couple.start_date),
      streak: {
        current: couple.streak_count,
        longest: couple.longest_streak,
        logged_today: Boolean(myLog),
      },
      sparks: {
        mine: me.spark_balance,
        partner: partner?.spark_balance ?? 0,
        combined: me.spark_balance + (partner?.spark_balance ?? 0),
      },
      today_mood: {
        mine: myLog?.mood_score ?? null,
        partner: partnerLog?.mood_score ?? null,
      },
      active_dare: activeDare,
      recent_milestones: milestones.data ?? [],
      active_missions: missions.data ?? [],
    };

    ok(res, snapshot);
  })
);
