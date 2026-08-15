/**
 * R.E.A.L. — Shared type contracts
 * Relationships · Ex's · Artificial · Language
 *
 * Single source of truth for every shape that crosses the
 * web <-> api <-> database boundary. Never redeclare these locally.
 */

/* ─────────────────────────────────────────────────────────────
   ENUMS / UNIONS
   ───────────────────────────────────────────────────────────── */

export const LOVE_LANGUAGES = ['words', 'acts', 'gifts', 'time', 'touch'] as const;
export type LoveLanguage = (typeof LOVE_LANGUAGES)[number];

export const RELATIONSHIP_TYPES = ['dating', 'committed', 'engaged', 'married'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const DISTANCE_TYPES = ['same_city', 'long_distance'] as const;
export type DistanceType = (typeof DISTANCE_TYPES)[number];

export const DARE_STATUSES = ['active', 'completed', 'skipped', 'expired'] as const;
export type DareStatus = (typeof DARE_STATUSES)[number];

export const LOG_MODES = ['private', 'shared', 'ai_prompted'] as const;
export type LogMode = (typeof LOG_MODES)[number];

export const MISSION_STATUSES = ['active', 'completed', 'abandoned'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const SPARK_DIRECTIONS = ['earn', 'spend'] as const;
export type SparkDirection = (typeof SPARK_DIRECTIONS)[number];

export const SPARK_SOURCES = [
  'daily_checkin',
  'streak_bonus',
  'dare_complete',
  'milestone',
  'mission_progress',
  'promise_kept',
  'appreciation',
  'quiz_complete',
  'memory_added',
  'redemption',
  'admin_adjustment',
] as const;
export type SparkSource = (typeof SPARK_SOURCES)[number];

export const QUIZ_KINDS = ['love_language', 'compatibility', 'who_is_more'] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

/* ─────────────────────────────────────────────────────────────
   CORE ENTITIES
   ───────────────────────────────────────────────────────────── */

/** A single partner. Extends Supabase auth.users. */
export interface User {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  love_language: LoveLanguage | null;
  personality_tag: string | null;
  couple_id: string | null;
  spark_balance: number;
  onboarding_done: boolean;
  created_at: string;
}

/** Couple theme config — drives per-couple accent colour and vibe. */
export interface CoupleAesthetic {
  color: string;
  vibe: string;
  emoji: string;
}

/** The shared couple space. Exactly two users may reference it. */
export interface Couple {
  id: string;
  ship_name: string | null;
  slug: string | null;
  start_date: string | null;
  relationship_type: RelationshipType | null;
  distance_type: DistanceType | null;
  how_we_met: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
  streak_count: number;
  streak_last_date: string | null;
  longest_streak: number;
  is_public: boolean;
  aesthetic: CoupleAesthetic | null;
  created_at: string;
}

/** Daily check-in / journal entry. One per user per day. */
export interface RealityLog {
  id: string;
  user_id: string;
  couple_id: string;
  log_date: string;
  mood_score: number;
  entry_text: string | null;
  shared_text: string | null;
  mode: LogMode;
  promise_made: string | null;
  promise_kept: boolean | null;
  sparks_awarded: number;
  created_at: string;
}

/** Weekly AI-generated couple dare. */
export interface Dare {
  id: string;
  couple_id: string;
  prompt_text: string;
  category: string | null;
  spark_reward: number;
  status: DareStatus;
  proof_url: string | null;
  completed_at: string | null;
  expires_at: string;
  week_number: number;
  created_at: string;
}

/** A shared goal with money attached (trip, ring, apartment). */
export interface Mission {
  id: string;
  couple_id: string;
  name: string;
  emoji: string | null;
  target_amount: number;
  saved_amount: number;
  currency: string;
  deadline: string | null;
  status: MissionStatus;
  bank_link: string | null;
  created_at: string;
}

/** Immutable ledger entry. Written only by the backend service key. */
export interface SparkTransaction {
  id: string;
  user_id: string;
  couple_id: string;
  amount: number;
  direction: SparkDirection;
  source: SparkSource;
  source_id: string | null;
  note: string | null;
  balance_after: number;
  created_at: string;
}

/** Redeemable item in the couple's Spark market. */
export interface Reward {
  id: string;
  couple_id: string | null;
  name: string;
  description: string | null;
  emoji: string;
  spark_cost: number;
  is_preset: boolean;
  created_at: string;
}

/** A redemption event — who cashed what in, and whether it's been honoured. */
export interface Redemption {
  id: string;
  couple_id: string;
  reward_id: string;
  redeemed_by: string;
  spark_cost: number;
  fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
  reward?: Reward;
}

/** A point on the relationship timeline. */
export interface Milestone {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  milestone_date: string;
  emoji: string;
  is_auto: boolean;
  created_at: string;
}

/** Memory Wall entry — photo + caption. */
export interface Memory {
  id: string;
  couple_id: string;
  created_by: string;
  caption: string;
  image_url: string | null;
  memory_date: string;
  created_at: string;
}

/** Stored quiz result for either partner. */
export interface QuizResult {
  id: string;
  couple_id: string;
  user_id: string;
  kind: QuizKind;
  answers: Record<string, string | number>;
  score: number | null;
  result_label: string | null;
  ai_summary: string | null;
  created_at: string;
}

/** Monthly AI-graded report card. */
export interface ReportCard {
  id: string;
  couple_id: string;
  period_start: string;
  period_end: string;
  grade: string;
  headline: string;
  body: string;
  stats: ReportCardStats;
  created_at: string;
}

export interface ReportCardStats {
  checkins: number;
  dares_completed: number;
  sparks_earned: number;
  avg_mood: number;
  memories_added: number;
  longest_streak: number;
}

/* ─────────────────────────────────────────────────────────────
   COMPOSED / VIEW MODELS
   ───────────────────────────────────────────────────────────── */

/** Everything the Universe dashboard needs in one payload. */
export interface UniverseSnapshot {
  couple: Couple;
  me: User;
  partner: User | null;
  days_together: number | null;
  next_anniversary: { date: string; days_away: number; label: string } | null;
  streak: { current: number; longest: number; logged_today: boolean };
  sparks: { mine: number; partner: number; combined: number };
  today_mood: { mine: number | null; partner: number | null };
  active_dare: Dare | null;
  recent_milestones: Milestone[];
  active_missions: Mission[];
}

/** Opt-in public couple card. No private data ever included. */
export interface PublicCoupleCard {
  ship_name: string;
  slug: string;
  emoji: string;
  color: string;
  vibe: string | null;
  days_together: number | null;
  streak_count: number;
  longest_streak: number;
  combined_sparks: number;
  milestones_hit: number;
  dares_completed: number;
  partners: Array<{ display_name: string; avatar_url: string | null; personality_tag: string | null }>;
  member_since: string;
}

export interface LeaderboardEntry {
  rank: number;
  slug: string;
  ship_name: string;
  emoji: string;
  streak_count: number;
  combined_sparks: number;
  days_together: number | null;
}

export interface MoodPoint {
  log_date: string;
  mine: number | null;
  partner: number | null;
}

export interface CompatibilityResult {
  score: number;
  headline: string;
  breakdown: Array<{ label: string; score: number; note: string }>;
  verdict: string;
}

/* ─────────────────────────────────────────────────────────────
   API ENVELOPE
   ───────────────────────────────────────────────────────────── */

export interface APISuccess<T> {
  ok: true;
  data: T;
}

export interface APIError {
  ok: false;
  error: {
    code: APIErrorCode;
    message: string;
    details?: unknown;
  };
}

export type APIResponse<T> = APISuccess<T> | APIError;

export const API_ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'COUPLE_FULL',
  'ALREADY_PAIRED',
  'NOT_PAIRED',
  'INVITE_INVALID',
  'INVITE_EXPIRED',
  'SELF_PAIR',
  'INSUFFICIENT_SPARKS',
  'ALREADY_LOGGED_TODAY',
  'DARE_NOT_ACTIVE',
  'RATE_LIMITED',
  'AI_UNAVAILABLE',
  'CONFIG_ERROR',
  'INTERNAL_ERROR',
] as const;
export type APIErrorCode = (typeof API_ERROR_CODES)[number];

/* ─────────────────────────────────────────────────────────────
   REQUEST PAYLOADS
   ───────────────────────────────────────────────────────────── */

export interface UpdateProfilePayload {
  display_name?: string;
  avatar_url?: string | null;
  love_language?: LoveLanguage;
  personality_tag?: string;
}

export interface CreateCouplePayload {
  ship_name: string;
  start_date: string;
  relationship_type: RelationshipType;
  distance_type: DistanceType;
  how_we_met?: string;
  aesthetic?: CoupleAesthetic;
}

export interface JoinCouplePayload {
  invite_code: string;
}

export interface CheckInPayload {
  mood_score: number;
  entry_text?: string;
  shared_text?: string;
  mode: LogMode;
  promise_made?: string;
  promise_kept?: boolean;
}

export interface CreateRewardPayload {
  name: string;
  description?: string;
  emoji: string;
  spark_cost: number;
}

export interface CreateMilestonePayload {
  title: string;
  description?: string;
  milestone_date: string;
  emoji: string;
}

export interface CreateMissionPayload {
  name: string;
  emoji?: string;
  target_amount: number;
  currency?: string;
  deadline?: string;
}

export interface CreateMemoryPayload {
  caption: string;
  image_url?: string;
  memory_date: string;
}

export interface CompleteDarePayload {
  proof_url?: string;
}

export interface SubmitQuizPayload {
  kind: QuizKind;
  answers: Record<string, string | number>;
}

/* ─────────────────────────────────────────────────────────────
   SPARK ECONOMY CONSTANTS
   Shared so the UI can show costs/rewards without a round trip.
   ───────────────────────────────────────────────────────────── */

export const SPARK_RULES = {
  DAILY_CHECKIN: 10,
  SHARED_ENTRY_BONUS: 5,
  PROMISE_KEPT: 15,
  STREAK_WEEK_BONUS: 25,
  DARE_BASE_REWARD: 40,
  MILESTONE_LOGGED: 20,
  MEMORY_ADDED: 8,
  QUIZ_COMPLETED: 15,
  MISSION_CONTRIBUTION: 10,
} as const;

export const MOOD_LABELS: Record<number, string> = {
  1: 'Rough day',
  2: 'Meh',
  3: 'Steady',
  4: 'Good',
  5: 'Glowing',
};

export const MOOD_EMOJI: Record<number, string> = {
  1: '🌧️',
  2: '😐',
  3: '🙂',
  4: '😄',
  5: '🤩',
};
