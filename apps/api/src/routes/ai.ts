import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { handler, ok } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { aiEnabled, journalInsight } from '../services/ai.service.js';
import { buildReportCard, currentMonthRange } from '../services/report.service.js';

export const aiRouter = Router();
aiRouter.use(requireAuth, requireCouple);

/** GET /ai/status — lets the UI hide AI features instead of failing at them. */
aiRouter.get(
  '/status',
  handler(async (_req, res) => {
    ok(res, { available: aiEnabled });
  })
);

/**
 * POST /ai/reflect — a short, non-clinical reflection on a journal entry.
 * Explicitly not therapy, and the prompt says so.
 */
aiRouter.post(
  '/reflect',
  validate(
    z.object({
      entry_text: z.string().trim().min(20).max(5000),
      mood_score: z.number().int().min(1).max(5),
    })
  ),
  handler(async (req, res) => {
    if (!aiEnabled) {
      throw new AppError('AI_UNAVAILABLE', 'AI reflections are switched off right now.', 503);
    }

    const { entry_text, mood_score } = req.body as { entry_text: string; mood_score: number };
    const insight = await journalInsight(entry_text, mood_score);
    ok(res, { insight });
  })
);

/**
 * GET /ai/report-card — this month's graded report.
 * Falls back to deterministic local grading when the AI is unavailable,
 * so the couple always gets their card.
 */
aiRouter.get(
  '/report-card',
  validate(
    z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      refresh: z.coerce.boolean().default(false),
    }),
    'query'
  ),
  handler(async (req, res) => {
    const couple = currentCouple(req);
    const query = req.query as unknown as { start?: string; end?: string; refresh: boolean };
    const range = currentMonthRange();

    const card = await buildReportCard(
      couple,
      query.start ?? range.start,
      query.end ?? range.end,
      { refresh: query.refresh }
    );

    ok(res, card);
  })
);
