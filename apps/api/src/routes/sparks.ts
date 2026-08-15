import { Router } from 'express';
import { z } from 'zod';
import type { Redemption, Reward } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { getBalances, getLedger, spend } from '../services/spark.service.js';

export const sparksRouter = Router();
sparksRouter.use(requireAuth, requireCouple);

/** GET /sparks — balances for both partners plus the combined total. */
sparksRouter.get(
  '/',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const balances = await getBalances(couple.id);
    ok(res, balances);
  })
);

/** GET /sparks/ledger — the transaction history, newest first. */
sparksRouter.get(
  '/ledger',
  validate(z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }), 'query'),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { limit } = req.query as unknown as { limit: number };
    ok(res, await getLedger(couple.id, limit));
  })
);

/** GET /sparks/store — global presets plus this couple's custom rewards. */
sparksRouter.get(
  '/store',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('rewards')
      .select('*')
      .or(`couple_id.is.null,couple_id.eq.${couple.id}`)
      .order('spark_cost', { ascending: true })
      .returns<Reward[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

const createRewardSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().max(280).optional(),
  emoji: z.string().min(1).max(8).default('🎁'),
  spark_cost: z.number().int().min(0).max(100000),
});

/** POST /sparks/store — define a custom reward for this couple only. */
sparksRouter.post(
  '/store',
  validate(createRewardSchema),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const body = req.body as z.infer<typeof createRewardSchema>;

    const { data, error } = await db
      .from('rewards')
      .insert({ ...body, couple_id: couple.id, is_preset: false })
      .select('*')
      .single<Reward>();

    if (error) throw fromPostgrest(error);
    created(res, data);
  })
);

/** DELETE /sparks/store/:id — remove a custom reward. Presets are untouchable. */
sparksRouter.delete(
  '/store/:id',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { error } = await db
      .from('rewards')
      .delete()
      .eq('id', req.params.id as string)
      .eq('couple_id', couple.id)
      .eq('is_preset', false);

    if (error) throw fromPostgrest(error);
    ok(res, { deleted: true });
  })
);

/**
 * POST /sparks/redeem — spend Sparks on a reward.
 * The ledger trigger refuses any spend that would go negative,
 * so an over-spend fails at the database, not just in this handler.
 */
sparksRouter.post(
  '/redeem',
  validate(z.object({ reward_id: z.string().uuid() })),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const { reward_id } = req.body as { reward_id: string };

    const { data: reward, error } = await db
      .from('rewards')
      .select('*')
      .eq('id', reward_id)
      .maybeSingle<Reward>();

    if (error) throw fromPostgrest(error);
    if (!reward) throw AppError.notFound('That reward does not exist.');

    if (reward.couple_id && reward.couple_id !== couple.id) {
      throw AppError.forbidden('That reward belongs to another couple.');
    }

    if (me.spark_balance < reward.spark_cost) {
      throw new AppError(
        'INSUFFICIENT_SPARKS',
        `You need ${reward.spark_cost - me.spark_balance} more Sparks for that.`,
        409
      );
    }

    const transaction = await spend({
      userId: me.id,
      coupleId: couple.id,
      amount: reward.spark_cost,
      source: 'redemption',
      sourceId: reward.id,
      note: reward.name,
    });

    const { data: redemption, error: redemptionError } = await db
      .from('redemptions')
      .insert({
        couple_id: couple.id,
        reward_id: reward.id,
        redeemed_by: me.id,
        spark_cost: reward.spark_cost,
      })
      .select('*')
      .single<Redemption>();

    if (redemptionError) throw fromPostgrest(redemptionError);

    created(res, {
      redemption,
      reward,
      balance_after: transaction.balance_after,
    });
  })
);

/** GET /sparks/redemptions — what has been cashed in, and what is still owed. */
sparksRouter.get(
  '/redemptions',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('redemptions')
      .select('*, reward:rewards(*)')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<Redemption[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

/** PATCH /sparks/redemptions/:id — mark a reward as actually honoured. */
sparksRouter.patch(
  '/redemptions/:id',
  validate(z.object({ fulfilled: z.boolean() })),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { fulfilled } = req.body as { fulfilled: boolean };

    const { data, error } = await db
      .from('redemptions')
      .update({ fulfilled, fulfilled_at: fulfilled ? new Date().toISOString() : null })
      .eq('id', req.params.id as string)
      .eq('couple_id', couple.id)
      .select('*')
      .maybeSingle<Redemption>();

    if (error) throw fromPostgrest(error);
    if (!data) throw AppError.notFound('No such redemption.');
    ok(res, data);
  })
);
