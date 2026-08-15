import type { Couple, ReportCard, ReportCardStats } from '@real/types';
import { averageMood } from '@real/utils';
import { db } from '../db/supabase.js';
import { fromPostgrest } from '../lib/errors.js';
import { log } from '../lib/logger.js';
import { aiEnabled, monthlyReportCard } from './ai.service.js';

/** Gather raw activity for a period. Pure counting, no judgement. */
export async function collectStats(
  coupleId: string,
  periodStart: string,
  periodEnd: string
): Promise<ReportCardStats> {
  const [logs, dares, sparks, memories, couple] = await Promise.all([
    db
      .from('reality_logs')
      .select('mood_score')
      .eq('couple_id', coupleId)
      .gte('log_date', periodStart)
      .lte('log_date', periodEnd)
      .returns<Array<{ mood_score: number }>>(),
    db
      .from('dares')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('status', 'completed')
      .gte('completed_at', periodStart)
      .lte('completed_at', `${periodEnd}T23:59:59Z`),
    db
      .from('spark_transactions')
      .select('amount')
      .eq('couple_id', coupleId)
      .eq('direction', 'earn')
      .gte('created_at', periodStart)
      .lte('created_at', `${periodEnd}T23:59:59Z`)
      .returns<Array<{ amount: number }>>(),
    db
      .from('memories')
      .select('id')
      .eq('couple_id', coupleId)
      .gte('memory_date', periodStart)
      .lte('memory_date', periodEnd),
    db.from('couples').select('longest_streak').eq('id', coupleId).maybeSingle<{ longest_streak: number }>(),
  ]);

  return {
    checkins: logs.data?.length ?? 0,
    dares_completed: dares.data?.length ?? 0,
    sparks_earned: (sparks.data ?? []).reduce((sum, s) => sum + s.amount, 0),
    avg_mood: averageMood((logs.data ?? []).map((l) => l.mood_score)),
    memories_added: memories.data?.length ?? 0,
    longest_streak: couple.data?.longest_streak ?? 0,
  };
}

/**
 * Build (or fetch the cached) report card for a period.
 * Falls back to a deterministic local grade when the AI is unavailable —
 * the couple always gets their report card.
 */
export async function buildReportCard(
  couple: Couple,
  periodStart: string,
  periodEnd: string,
  { refresh = false }: { refresh?: boolean } = {}
): Promise<ReportCard> {
  if (!refresh) {
    const { data: cached } = await db
      .from('report_cards')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('period_start', periodStart)
      .maybeSingle<ReportCard>();
    if (cached) return cached;
  }

  const stats = await collectStats(couple.id, periodStart, periodEnd);

  let grade: string;
  let headline: string;
  let body: string;

  try {
    if (!aiEnabled) throw new Error('AI disabled');
    const generated = await monthlyReportCard(couple, stats);
    grade = generated.grade;
    headline = generated.headline;
    body = generated.body;
  } catch (error) {
    log.warn('Report card falling back to local grading', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    const local = gradeLocally(stats);
    grade = local.grade;
    headline = local.headline;
    body = local.body;
  }

  const { data, error } = await db
    .from('report_cards')
    .upsert(
      {
        couple_id: couple.id,
        period_start: periodStart,
        period_end: periodEnd,
        grade,
        headline,
        body,
        stats,
      },
      { onConflict: 'couple_id,period_start' }
    )
    .select('*')
    .single<ReportCard>();

  if (error) throw fromPostgrest(error);
  return data;
}

/**
 * Deterministic grading. Generous on purpose — R.E.A.L. is meant to make
 * showing up feel good, not to punish a quiet month.
 */
export function gradeLocally(stats: ReportCardStats): { grade: string; headline: string; body: string } {
  const points =
    Math.min(stats.checkins, 30) * 2 +
    stats.dares_completed * 8 +
    Math.min(stats.memories_added, 10) * 3 +
    stats.avg_mood * 4 +
    Math.min(stats.longest_streak, 30);

  const grade =
    points >= 110 ? 'A+' :
    points >= 90 ? 'A' :
    points >= 72 ? 'B+' :
    points >= 55 ? 'B' :
    points >= 38 ? 'C+' :
    points >= 20 ? 'C' : 'Incomplete';

  const headline =
    points >= 90 ? 'You two are showing off' :
    points >= 55 ? 'Quietly, consistently good' :
    points >= 20 ? 'Present, if a little distracted' :
    'A slow month. It happens.';

  const body =
    `${stats.checkins} check-ins, ${stats.dares_completed} dares completed, ` +
    `${stats.memories_added} memories added, and an average mood of ${stats.avg_mood} out of 5. ` +
    `Longest streak this period: ${stats.longest_streak} days.\n\n` +
    (points >= 55
      ? 'Whatever you are doing, keep doing it. The streak is the story here.'
      : 'Next month, aim for one small thing: check in on the same day, at the same time, together. Consistency beats grand gestures every single time.');

  return { grade, headline, body };
}

export function currentMonthRange(now = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
