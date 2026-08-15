import type { Couple, Dare } from '@real/types';
import { relationshipWeek } from '@real/utils';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { log } from '../lib/logger.js';
import { aiEnabled, generateDare } from './ai.service.js';

/** The couple's one active dare, if any. Expires stale ones on the way past. */
export async function getActiveDare(coupleId: string): Promise<Dare | null> {
  await expireStaleDares(coupleId);

  const { data, error } = await db
    .from('dares')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .maybeSingle<Dare>();

  if (error) throw fromPostgrest(error);
  return data;
}

export async function expireStaleDares(coupleId: string): Promise<void> {
  const { error } = await db
    .from('dares')
    .update({ status: 'expired' })
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());

  if (error) log.warn('Could not expire stale dares', { message: error.message });
}

/**
 * Issue a new dare. Tries Claude first; falls back to the curated pool
 * so the feature never simply breaks when the AI is unavailable.
 */
export async function issueDare(couple: Couple): Promise<Dare> {
  const existing = await getActiveDare(couple.id);
  if (existing) return existing;

  const weekNumber = relationshipWeek(couple.start_date);
  const recent = await recentDareTexts(couple.id);

  let prompt_text: string;
  let category: string;
  let spark_reward: number;

  try {
    if (!aiEnabled) throw new Error('AI disabled');
    const suggestion = await generateDare(couple, weekNumber, recent);
    prompt_text = suggestion.prompt_text;
    category = suggestion.category;
    spark_reward = suggestion.spark_reward;
  } catch (error) {
    log.warn('Falling back to curated dare pool', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    const fallback = await pickFromPool(couple, recent);
    prompt_text = fallback.prompt_text;
    category = fallback.category;
    spark_reward = fallback.spark_reward;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('dares')
    .insert({
      couple_id: couple.id,
      prompt_text,
      category,
      spark_reward,
      status: 'active',
      week_number: weekNumber,
      expires_at: expiresAt,
    })
    .select('*')
    .single<Dare>();

  if (error) throw fromPostgrest(error);
  return data;
}

export async function skipDare(coupleId: string, dareId: string): Promise<Dare> {
  const { data, error } = await db
    .from('dares')
    .update({ status: 'skipped' })
    .eq('id', dareId)
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle<Dare>();

  if (error) throw fromPostgrest(error);
  if (!data) throw new AppError('DARE_NOT_ACTIVE', 'That dare is not active any more.', 409);
  return data;
}

export async function completeDare(
  coupleId: string,
  dareId: string,
  proofUrl?: string
): Promise<Dare> {
  const { data, error } = await db
    .from('dares')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...(proofUrl ? { proof_url: proofUrl } : {}),
    })
    .eq('id', dareId)
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle<Dare>();

  if (error) throw fromPostgrest(error);
  if (!data) throw new AppError('DARE_NOT_ACTIVE', 'That dare is not active any more.', 409);
  return data;
}

export async function dareHistory(coupleId: string, limit = 30): Promise<Dare[]> {
  const { data, error } = await db
    .from('dares')
    .select('*')
    .eq('couple_id', coupleId)
    .neq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<Dare[]>();

  if (error) throw fromPostgrest(error);
  return data ?? [];
}

/* ── helpers ─────────────────────────────────────────────────── */

async function recentDareTexts(coupleId: string): Promise<string[]> {
  const { data } = await db
    .from('dares')
    .select('prompt_text')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<Array<{ prompt_text: string }>>();

  return (data ?? []).map((d) => d.prompt_text);
}

interface PoolDare {
  prompt_text: string;
  category: string;
  spark_reward: number;
}

async function pickFromPool(couple: Couple, recent: string[]): Promise<PoolDare> {
  const query = db.from('dare_pool').select('prompt_text, category, spark_reward');

  if (couple.distance_type) {
    query.or(`distance_type.is.null,distance_type.eq.${couple.distance_type}`);
  }

  const { data, error } = await query.returns<PoolDare[]>();
  if (error) throw fromPostgrest(error);

  const pool = data ?? [];
  if (pool.length === 0) {
    return {
      prompt_text: 'Tell them one specific thing you noticed about them this week — something they would not expect you to have seen.',
      category: 'appreciation',
      spark_reward: 40,
    };
  }

  const unseen = pool.filter((d) => !recent.includes(d.prompt_text));
  const candidates = unseen.length > 0 ? unseen : pool;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return picked ?? candidates[0]!;
}
