import type { SparkDirection, SparkSource, SparkTransaction, User } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';

interface LedgerInput {
  userId: string;
  coupleId: string;
  amount: number;
  direction: SparkDirection;
  source: SparkSource;
  sourceId?: string | null;
  note?: string | null;
}

/**
 * The ONLY way Sparks move.
 *
 * The database trigger computes balance_after, updates users.spark_balance
 * and refuses any spend that would go negative — so this function is a thin,
 * honest wrapper rather than a second source of truth.
 */
export async function recordSparks(input: LedgerInput): Promise<SparkTransaction> {
  if (input.amount <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Spark amount must be positive.', 422);
  }

  const { data, error } = await db
    .from('spark_transactions')
    .insert({
      user_id: input.userId,
      couple_id: input.coupleId,
      amount: input.amount,
      direction: input.direction,
      source: input.source,
      source_id: input.sourceId ?? null,
      note: input.note ?? null,
    })
    .select('*')
    .single<SparkTransaction>();

  if (error) throw fromPostgrest(error);
  return data;
}

export async function earn(
  input: Omit<LedgerInput, 'direction'>
): Promise<SparkTransaction> {
  return recordSparks({ ...input, direction: 'earn' });
}

export async function spend(
  input: Omit<LedgerInput, 'direction'>
): Promise<SparkTransaction> {
  return recordSparks({ ...input, direction: 'spend' });
}

export async function getBalances(coupleId: string): Promise<{
  members: Array<Pick<User, 'id' | 'display_name' | 'spark_balance'>>;
  combined: number;
}> {
  const { data, error } = await db
    .from('users')
    .select('id, display_name, spark_balance')
    .eq('couple_id', coupleId)
    .returns<Array<Pick<User, 'id' | 'display_name' | 'spark_balance'>>>();

  if (error) throw fromPostgrest(error);
  const members = data ?? [];
  return {
    members,
    combined: members.reduce((sum, m) => sum + m.spark_balance, 0),
  };
}

export async function getLedger(coupleId: string, limit = 50): Promise<SparkTransaction[]> {
  const { data, error } = await db
    .from('spark_transactions')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<SparkTransaction[]>();

  if (error) throw fromPostgrest(error);
  return data ?? [];
}
