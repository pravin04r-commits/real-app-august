/**
 * R.E.A.L. — Shared pure helpers
 * No I/O, no side effects. Safe on both client and server.
 */

import {
  differenceInCalendarDays,
  addYears,
  format,
  parseISO,
  isValid,
  startOfDay,
} from 'date-fns';
import { SPARK_RULES, type Couple, type MoodPoint, type RealityLog } from '@real/types';

/* ─────────────────────────────────────────────────────────────
   DATES
   ───────────────────────────────────────────────────────────── */

/** Today as an ISO date string (YYYY-MM-DD) in the runtime's local zone. */
export function todayISO(now: Date = new Date()): string {
  return format(startOfDay(now), 'yyyy-MM-dd');
}

export function safeParseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** Whole days since the relationship started. Null if no start date. */
export function daysTogether(startDate: string | null, now: Date = new Date()): number | null {
  const start = safeParseDate(startDate);
  if (!start) return null;
  return Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(start)));
}

/** The next anniversary of start_date, with a human label. */
export function nextAnniversary(
  startDate: string | null,
  now: Date = new Date()
): { date: string; days_away: number; label: string } | null {
  const start = safeParseDate(startDate);
  if (!start) return null;

  const today = startOfDay(now);
  let years = today.getFullYear() - start.getFullYear();
  let candidate = addYears(start, years);
  if (differenceInCalendarDays(candidate, today) < 0) {
    years += 1;
    candidate = addYears(start, years);
  }

  return {
    date: format(candidate, 'yyyy-MM-dd'),
    days_away: differenceInCalendarDays(candidate, today),
    label: years === 1 ? '1 year' : `${years} years`,
  };
}

/** Week number of the relationship — drives dare cadence. Starts at 1. */
export function relationshipWeek(startDate: string | null, now: Date = new Date()): number {
  const days = daysTogether(startDate, now);
  if (days === null) return 1;
  return Math.floor(days / 7) + 1;
}

/* ─────────────────────────────────────────────────────────────
   STREAKS
   ───────────────────────────────────────────────────────────── */

export interface StreakUpdate {
  streak_count: number;
  streak_last_date: string;
  longest_streak: number;
  /** True when this check-in extended an existing streak. */
  continued: boolean;
  /** True when a previous streak was broken by a missed day. */
  broken: boolean;
}

/**
 * Pure streak transition. Same-day repeat check-ins are idempotent —
 * they never inflate the streak.
 */
export function advanceStreak(
  couple: Pick<Couple, 'streak_count' | 'streak_last_date' | 'longest_streak'>,
  logDate: string
): StreakUpdate {
  const last = safeParseDate(couple.streak_last_date);
  const current = safeParseDate(logDate);
  if (!current) {
    return {
      streak_count: couple.streak_count,
      streak_last_date: couple.streak_last_date ?? logDate,
      longest_streak: couple.longest_streak,
      continued: false,
      broken: false,
    };
  }

  if (!last) {
    return {
      streak_count: 1,
      streak_last_date: logDate,
      longest_streak: Math.max(1, couple.longest_streak),
      continued: false,
      broken: false,
    };
  }

  const gap = differenceInCalendarDays(startOfDay(current), startOfDay(last));

  if (gap === 0) {
    return {
      streak_count: couple.streak_count,
      streak_last_date: couple.streak_last_date ?? logDate,
      longest_streak: couple.longest_streak,
      continued: false,
      broken: false,
    };
  }

  if (gap === 1) {
    const next = couple.streak_count + 1;
    return {
      streak_count: next,
      streak_last_date: logDate,
      longest_streak: Math.max(next, couple.longest_streak),
      continued: true,
      broken: false,
    };
  }

  return {
    streak_count: 1,
    streak_last_date: logDate,
    longest_streak: Math.max(1, couple.longest_streak),
    continued: false,
    broken: gap > 1,
  };
}

/** Streak milestones award a bonus every 7 days. */
export function streakBonus(streakCount: number): number {
  if (streakCount > 0 && streakCount % 7 === 0) return SPARK_RULES.STREAK_WEEK_BONUS;
  return 0;
}

/* ─────────────────────────────────────────────────────────────
   SPARKS
   ───────────────────────────────────────────────────────────── */

export interface CheckInSparkBreakdown {
  base: number;
  shared_bonus: number;
  promise_bonus: number;
  streak_bonus: number;
  total: number;
}

export function calcCheckInSparks(input: {
  mode: string;
  hasSharedText: boolean;
  promiseKept: boolean | null | undefined;
  streakCount: number;
}): CheckInSparkBreakdown {
  const base = SPARK_RULES.DAILY_CHECKIN;
  const shared_bonus = input.hasSharedText || input.mode === 'shared' ? SPARK_RULES.SHARED_ENTRY_BONUS : 0;
  const promise_bonus = input.promiseKept === true ? SPARK_RULES.PROMISE_KEPT : 0;
  const streak_bonus = streakBonus(input.streakCount);
  return {
    base,
    shared_bonus,
    promise_bonus,
    streak_bonus,
    total: base + shared_bonus + promise_bonus + streak_bonus,
  };
}

/** Balance can never go negative. Returns null when the spend is not affordable. */
export function applySpend(balance: number, cost: number): number | null {
  if (cost < 0) return null;
  const next = balance - cost;
  return next < 0 ? null : next;
}

export function formatSparks(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

/* ─────────────────────────────────────────────────────────────
   IDENTITY
   ───────────────────────────────────────────────────────────── */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — unambiguous

/** 6-character invite code. Pass a custom RNG for deterministic tests. */
export function generateInviteCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** URL-safe slug for public couple cards. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Blend two names into a ship name: Pravin + Riya -> "Pravya". */
export function shipName(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return `${left}${right}` || 'Us';
  const head = left.slice(0, Math.max(2, Math.ceil(left.length / 2)));
  const tail = right.slice(Math.floor(right.length / 2));
  const merged = `${head}${tail}`;
  return merged.charAt(0).toUpperCase() + merged.slice(1).toLowerCase();
}

/* ─────────────────────────────────────────────────────────────
   MOOD
   ───────────────────────────────────────────────────────────── */

/** Merge both partners' logs into one timeline for the mood sync chart. */
export function buildMoodTimeline(
  logs: Pick<RealityLog, 'log_date' | 'mood_score' | 'user_id'>[],
  myUserId: string
): MoodPoint[] {
  const byDate = new Map<string, MoodPoint>();
  for (const log of logs) {
    const point = byDate.get(log.log_date) ?? { log_date: log.log_date, mine: null, partner: null };
    if (log.user_id === myUserId) point.mine = log.mood_score;
    else point.partner = log.mood_score;
    byDate.set(log.log_date, point);
  }
  return [...byDate.values()].sort((a, b) => a.log_date.localeCompare(b.log_date));
}

export function averageMood(scores: Array<number | null | undefined>): number {
  const valid = scores.filter((s): s is number => typeof s === 'number');
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((sum, s) => sum + s, 0) / valid.length) * 10) / 10;
}

/**
 * How in-sync the two partners were, 0–100.
 * 100 = identical moods every logged day.
 */
export function moodSyncScore(timeline: MoodPoint[]): number {
  const paired = timeline.filter((p) => p.mine !== null && p.partner !== null);
  if (paired.length === 0) return 0;
  const totalDrift = paired.reduce((sum, p) => sum + Math.abs((p.mine as number) - (p.partner as number)), 0);
  const maxDrift = paired.length * 4;
  return Math.round((1 - totalDrift / maxDrift) * 100);
}

/* ─────────────────────────────────────────────────────────────
   MISC
   ───────────────────────────────────────────────────────────── */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(current: number, target: number): number {
  if (target <= 0) return 0;
  return clamp(Math.round((current / target) * 100), 0, 100);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return n === 1 ? singular : plural;
}

export function formatDatePretty(value: string | null | undefined): string {
  const date = safeParseDate(value ?? null);
  return date ? format(date, 'd MMM yyyy') : '—';
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
