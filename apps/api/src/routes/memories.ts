import { Router } from 'express';
import { z } from 'zod';
import { SPARK_RULES, type Memory } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { earn } from '../services/spark.service.js';

export const memoriesRouter = Router();
memoriesRouter.use(requireAuth, requireCouple);

/** GET /memories — the wall, newest first. */
memoriesRouter.get(
  '/',
  validate(z.object({ limit: z.coerce.number().int().min(1).max(200).default(60) }), 'query'),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { limit } = req.query as unknown as { limit: number };

    const { data, error } = await db
      .from('memories')
      .select('*')
      .eq('couple_id', couple.id)
      .order('memory_date', { ascending: false })
      .limit(limit)
      .returns<Memory[]>();

    if (error) throw fromPostgrest(error);
    ok(res, data ?? []);
  })
);

const createSchema = z.object({
  caption: z.string().trim().min(1).max(500),
  image_url: z.string().url().optional(),
  memory_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** POST /memories — add to the jar. */
memoriesRouter.post(
  '/',
  validate(createSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const body = req.body as z.infer<typeof createSchema>;

    const { data, error } = await db
      .from('memories')
      .insert({ ...body, couple_id: couple.id, created_by: me.id })
      .select('*')
      .single<Memory>();

    if (error) throw fromPostgrest(error);

    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: SPARK_RULES.MEMORY_ADDED,
      source: 'memory_added',
      sourceId: data.id,
      note: 'Memory added',
    });

    created(res, data);
  })
);

memoriesRouter.delete(
  '/:id',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('memories')
      .delete()
      .eq('id', req.params.id as string)
      .eq('couple_id', couple.id)
      .select('id')
      .maybeSingle();

    if (error) throw fromPostgrest(error);
    if (!data) throw AppError.notFound('No such memory.');
    ok(res, { deleted: true });
  })
);
