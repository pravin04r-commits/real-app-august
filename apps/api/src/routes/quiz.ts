import { Router } from 'express';
import { z } from 'zod';
import { QUIZ_KINDS, SPARK_RULES, type CompatibilityResult, type QuizKind } from '@real/types';
import { AppError } from '../lib/errors.js';
import { created, handler, ok } from '../lib/http.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { currentCouple, requireCouple } from '../middleware/couple-guard.js';
import { validate } from '../middleware/validate.js';
import { aiEnabled, compatibilityVerdict, loveLanguageInsight } from '../services/ai.service.js';
import {
  latestResults,
  mineFrom,
  partnerOf,
  questionsFor,
  saveQuizResult,
  scoreCompatibility,
  scoreLoveLanguage,
  setLoveLanguages,
} from '../services/quiz.service.js';
import { earn } from '../services/spark.service.js';
import { log } from '../lib/logger.js';

export const quizRouter = Router();
quizRouter.use(requireAuth, requireCouple);

/** GET /quiz/:kind/questions — one source of truth for UI and scoring. */
quizRouter.get(
  '/:kind/questions',
  handler(async (req, res) => {
    const kind = req.params.kind as QuizKind;
    if (!QUIZ_KINDS.includes(kind)) throw AppError.notFound('No such quiz.');
    ok(res, { kind, questions: questionsFor(kind) });
  })
);

const submitSchema = z.object({
  answers: z.record(z.union([z.string(), z.number()])),
});

/**
 * POST /quiz/:kind — submit answers and get a result.
 *
 * Love language: scored solo, saved to the profile, cross-mapped with the
 * partner once both have answered.
 * Compatibility: needs both partners; the second submission triggers the score.
 */
quizRouter.post(
  '/:kind',
  validate(submitSchema),
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const kind = req.params.kind as QuizKind;
    if (!QUIZ_KINDS.includes(kind)) throw AppError.notFound('No such quiz.');

    const { answers } = req.body as z.infer<typeof submitSchema>;

    if (kind === 'love_language') {
      const scored = scoreLoveLanguage(answers);
      await setLoveLanguages(me.id, scored.languages);

      const saved = await saveQuizResult({
        coupleId: couple.id,
        userId: me.id,
        kind,
        answers,
        resultLabel: scored.labels.join(' + '),
      });

      await earn({
        userId: me.id,
        coupleId: couple.id,
        amount: SPARK_RULES.QUIZ_COMPLETED,
        source: 'quiz_complete',
        sourceId: saved.id,
        note: 'Love Language Quiz',
      });

      const partner = req.partner;
      let insight: string | null = null;

      if (partner?.love_languages?.length && aiEnabled) {
        try {
          insight = await loveLanguageInsight(
            { display_name: me.display_name, love_languages: scored.languages },
            { display_name: partner.display_name, love_languages: partner.love_languages }
          );
        } catch (error) {
          log.warn('Love language insight unavailable', {
            message: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      created(res, {
        language: scored.language,
        languages: scored.languages,
        label: scored.label,
        labels: scored.labels,
        tally: scored.tally,
        partner_languages: partner?.love_languages ?? [],
        insight,
        sparks_earned: SPARK_RULES.QUIZ_COMPLETED,
      });
      return;
    }

    if (kind === 'compatibility') {
      const saved = await saveQuizResult({ coupleId: couple.id, userId: me.id, kind, answers });

      await earn({
        userId: me.id,
        coupleId: couple.id,
        amount: SPARK_RULES.QUIZ_COMPLETED,
        source: 'quiz_complete',
        sourceId: saved.id,
        note: 'Compatibility Quiz',
      });

      const results = await latestResults(couple.id, kind);
      const theirs = partnerOf(results, me.id);

      if (!theirs) {
        created(res, {
          waiting_for_partner: true,
          message: 'Answers locked in. Nothing happens until they take it too.',
          sparks_earned: SPARK_RULES.QUIZ_COMPLETED,
        });
        return;
      }

      const result: CompatibilityResult = scoreCompatibility(answers, theirs.answers);

      if (aiEnabled) {
        try {
          result.verdict = await compatibilityVerdict(result.score, result.breakdown);
        } catch (error) {
          log.warn('Compatibility verdict unavailable', {
            message: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      created(res, { waiting_for_partner: false, ...result, sparks_earned: SPARK_RULES.QUIZ_COMPLETED });
      return;
    }

    // who_is_more — pure fun, scored on the client, stored for the record
    const saved = await saveQuizResult({ coupleId: couple.id, userId: me.id, kind, answers });
    await earn({
      userId: me.id,
      coupleId: couple.id,
      amount: SPARK_RULES.QUIZ_COMPLETED,
      source: 'quiz_complete',
      sourceId: saved.id,
      note: 'Who Is More Quiz',
    });

    const results = await latestResults(couple.id, kind);
    const theirs = partnerOf(results, me.id);

    created(res, {
      waiting_for_partner: !theirs,
      mine: answers,
      theirs: theirs?.answers ?? null,
      sparks_earned: SPARK_RULES.QUIZ_COMPLETED,
    });
  })
);

/** GET /quiz/:kind/results — latest result for each partner. */
quizRouter.get(
  '/:kind/results',
  handler(async (req, res) => {
    const me = currentUser(req);
    const couple = currentCouple(req);
    const kind = req.params.kind as QuizKind;
    if (!QUIZ_KINDS.includes(kind)) throw AppError.notFound('No such quiz.');

    const results = await latestResults(couple.id, kind);
    ok(res, {
      mine: mineFrom(results, me.id),
      theirs: partnerOf(results, me.id),
    });
  })
);
