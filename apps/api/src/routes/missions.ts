import { Router } from 'express';
import { z } from 'zod';
import { SPARK_RULES, type Mission } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { earn } from '../services/spark.service.js';

export const missionsRouter = Router();
missionsRouter.use(requireAuth, requireCouple);

/** GET /missions — shared goals with money attached. */
missionsRouter.get(
  '/',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('missions')
      .select('*')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: false })
      .returns<Mission[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  emoji: z.string().min(1).max(8).default('🎯'),
  target_amount: z.number().positive().max(1_000_000_000),
  currency: z.string().length(3).default('INR'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

missionsRouter.post(
  '/',
  validate(createSchema),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const body = req.body as z.infer<typeof createSchema>;

    const { data, error } = await db
      .from('missions')
      .insert({ ...body, couple_id: couple.id })
      .select('*')
      .single<Mission>();

    if (error) throw fromPostgrest(error);
    created(res, data);
  })
);

/** POST /missions/:id/contribute — move the bar, earn Sparks. */
missionsRouter.post(
  '/:id/contribute',
  validate(z.object({ amount: z.number().positive().max(1_000_000_000) })),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const { amount } = req.body as { amount: number };
    const id = req.params.id as string;

    const { data: mission, error } = await db
      .from('missions')
      .select('*')
      .eq('id', id)
      .eq('couple_id', couple.id)
      .maybeSingle<Mission>();

    if (error) throw fromPostgrest(error);
    if (!mission) throw AppError.notFound('No such mission.');

    const saved = Number(mission.saved_amount) + amount;
    const reachedTarget = saved >= Number(mission.target_amount);

    const { data: updated, error: updateError } = await db
      .from('missions')
      .update({
        saved_amount: saved,
        status: reachedTarget ? 'completed' : mission.status,
      })
      .eq('id', id)
      .select('*')
      .single<Mission>();

    if (updateError) throw fromPostgrest(updateError);

    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: SPARK_RULES.MISSION_CONTRIBUTION,
      source: 'mission_progress',
      sourceId: mission.id,
      note: `Contributed to ${mission.name}`,
    });

    ok(res, { mission: updated, completed: reachedTarget });
  })
);

missionsRouter.patch(
  '/:id',
  validate(
    z.object({
      name: z.string().trim().min(2).max(60).optional(),
      emoji: z.string().min(1).max(8).optional(),
      target_amount: z.number().positive().optional(),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      status: z.enum(['active', 'completed', 'abandoned']).optional(),
      bank_link: z.string().url().nullable().optional(),
    })
  ),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('missions')
      .update(req.body as Record<string, unknown>)
      .eq('id', req.params.id as string)
      .eq('couple_id', couple.id)
      .select('*')
      .maybeSingle<Mission>();

    if (error) throw fromPostgrest(error);
    if (!data) throw AppError.notFound('No such mission.');
    ok(res, data);
  })
);
