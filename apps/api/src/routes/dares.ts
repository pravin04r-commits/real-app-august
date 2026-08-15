import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/supabase.js';
import { fromPostgrest } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import {
  completeDare,
  dareHistory,
  getActiveDare,
  issueDare,
  skipDare,
} from '../services/dare.service.js';
import { earn } from '../services/spark.service.js';

export const daresRouter = Router();
daresRouter.use(requireAuth, requireCouple);

/** GET /dares/active — the current dare, or null if none is running. */
daresRouter.get(
  '/active',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    ok(res, await getActiveDare(couple.id));
  })
);

/** POST /dares/new — issue this week's dare (AI first, curated pool as fallback). */
daresRouter.post(
  '/new',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    created(res, await issueDare(couple));
  })
);

/**
 * POST /dares/:id/complete — both partners get the Sparks.
 * A dare is a joint effort; paying only the person who tapped the
 * button would quietly turn it into a competition.
 */
daresRouter.post(
  '/:id/complete',
  validate(z.object({ proof_url: z.string().url().optional() })),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const partner = req.partner ?? null;
    const { proof_url } = req.body as { proof_url?: string };

    const dare = await completeDare(couple.id, req.params.id as string, proof_url);

    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: dare.spark_reward,
      source: 'dare_complete',
      sourceId: dare.id,
      note: 'Dare completed',
    });

    if (partner) {
      await earn({
        userId: partner.id,
        coupleId: couple.id,
        amount: dare.spark_reward,
        source: 'dare_complete',
        sourceId: dare.id,
        note: 'Dare completed',
      });
    }

    ok(res, { dare, sparks_each: dare.spark_reward });
  })
);

/** POST /dares/:id/skip — no shame, no Sparks. */
daresRouter.post(
  '/:id/skip',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    ok(res, await skipDare(couple.id, req.params.id as string));
  })
);

/** GET /dares/history — everything already resolved. */
daresRouter.get(
  '/history',
  validate(z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) }), 'query'),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { limit } = req.query as unknown as { limit: number };
    ok(res, await dareHistory(couple.id, limit));
  })
);

/** GET /dares/stats — completion counts for the report card and public card. */
daresRouter.get(
  '/stats',
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const { data, error } = await db
      .from('dares')
      .select('status')
      .eq('couple_id', couple.id)
      .returns<Array<{ status: string }>>();

    if (error) throw fromPostgrest(error);

    const rows = data ?? [];
    ok(res, {
      total: rows.length,
      completed: rows.filter((r) => r.status === 'completed').length,
      skipped: rows.filter((r) => r.status === 'skipped').length,
      expired: rows.filter((r) => r.status === 'expired').length,
    });
  })
);
