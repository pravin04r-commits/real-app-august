import type { Couple } from '@real/types';
import { advanceStreak, streakBonus, type StreakUpdate } from '@real/utils';
import { db } from '../db/supabase.js';
import { fromPostgrest } from '../lib/errors.js';

/**
 * Applies a check-in to the couple's streak and persists the result.
 * Idempotent for same-day repeats — a second check-in on the same date
 * never inflates the count.
 */
export async function applyCheckInToStreak(couple: Couple, logDate: string): Promise<StreakUpdate> {
  const update = advanceStreak(couple, logDate);

  const unchanged =
    update.streak_count === couple.streak_count &&
    update.streak_last_date === couple.streak_last_date &&
    update.longest_streak === couple.longest_streak;

  if (unchanged) return update;

  const { error } = await db
    .from('couples')
    .update({
      streak_count: update.streak_count,
      streak_last_date: update.streak_last_date,
      longest_streak: update.longest_streak,
    })
    .eq('id', couple.id);

  if (error) throw fromPostgrest(error);
  return update;
}

export { streakBonus };
