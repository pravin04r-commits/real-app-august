import { Router } from 'express';
import { z } from 'zod';
import { SPARK_RULES, type Milestone } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { earn } from '../services/spark.service.js';

export const milestonesRouter = Router();
milestonesRouter.use(requireAuth, requireCouple);

/** GET /milestones — the timeline, newest first. */
milestonesRouter.get(
  '/',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('milestones')
      .select('*')
      .eq('couple_id', couple.id)
      .order('milestone_date', { ascending: false })
      .returns<Milestone[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

const createSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().max(500).optional(),
  milestone_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  emoji: z.string().min(1).max(8).default('✨'),
});

/** POST /milestones — log a moment. Worth Sparks; remembering counts. */
milestonesRouter.post(
  '/',
  validate(createSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const body = req.body as z.infer<typeof createSchema>;

    const { data, error } = await db
      .from('milestones')
      .insert({ ...body, couple_id: couple.id, is_auto: false })
      .select('*')
      .single<Milestone>();

    if (error) throw fromPostgrest(error);

    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: SPARK_RULES.MILESTONE_LOGGED,
      source: 'milestone',
      sourceId: data.id,
      note: data.title,
    });

    created(res, data);
  })
);

/** DELETE /milestones/:id — auto-generated milestones cannot be removed. */
milestonesRouter.delete(
  '/:id',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('milestones')
      .delete()
      .eq('id', req.params.id as string)
      .eq('couple_id', couple.id)
      .eq('is_auto', false)
      .select('id')
      .maybeSingle();

    if (error) throw fromPostgrest(error);
    if (!data) throw AppError.notFound('Nothing to delete here.');
    ok(res, { deleted: true });
  })
);
