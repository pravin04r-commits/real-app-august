import type { CompatibilityResult, LoveLanguage, QuizKind, QuizResult, User } from '@real/types';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';

export interface QuizQuestion {
  id: string;
  text: string;
  options: Array<{ value: string; label: string }>;
}

/* ─────────────────────────────────────────────────────────────
   QUESTION BANKS — served to the client so there is one
   source of truth for both the UI and the scoring.
   ───────────────────────────────────────────────────────────── */

const LOVE_LANGUAGE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'll1',
    text: 'Rough day. What actually fixes it?',
    options: [
      { value: 'words', label: 'They tell you exactly what you mean to them' },
      { value: 'touch', label: 'They just hold you and say nothing' },
      { value: 'acts', label: 'They quietly handle the thing you were dreading' },
      { value: 'time', label: 'They cancel everything and stay in with you' },
    ],
  },
  {
    id: 'll2',
    text: 'They have been away for two weeks. What do you miss most?',
    options: [
      { value: 'touch', label: 'Being physically near them' },
      { value: 'time', label: 'Doing nothing together' },
      { value: 'words', label: 'The way they talk to you' },
      { value: 'gifts', label: 'The little things they bring back for you' },
    ],
  },
  {
    id: 'll3',
    text: 'Which one would sting the most?',
    options: [
      { value: 'words', label: 'They stop complimenting you' },
      { value: 'acts', label: 'They stop helping without being asked' },
      { value: 'time', label: 'They are always busy' },
      { value: 'touch', label: 'They stop reaching for you' },
    ],
  },
  {
    id: 'll4',
    text: 'How do YOU show love without noticing you are doing it?',
    options: [
      { value: 'acts', label: 'You do things for them' },
      { value: 'gifts', label: 'You buy them stuff you saw and thought of them' },
      { value: 'words', label: 'You tell them constantly' },
      { value: 'time', label: 'You give them your undivided attention' },
    ],
  },
  {
    id: 'll5',
    text: 'Best possible anniversary?',
    options: [
      { value: 'time', label: 'A whole day, just the two of you, no plans' },
      { value: 'gifts', label: 'Something they clearly thought hard about' },
      { value: 'words', label: 'A letter you will keep forever' },
      { value: 'acts', label: 'They handle everything so you can switch off' },
    ],
  },
  {
    id: 'll6',
    text: 'You are arguing. What ends it fastest?',
    options: [
      { value: 'touch', label: 'They reach out and hold your hand' },
      { value: 'words', label: 'They say the words you needed to hear' },
      { value: 'time', label: 'They sit with it instead of walking away' },
      { value: 'acts', label: 'They show you they changed, not just said it' },
    ],
  },
];

const COMPATIBILITY_QUESTIONS: QuizQuestion[] = [
  {
    id: 'c1',
    text: 'Friday night, no obligations.',
    options: [
      { value: 'in', label: 'Home. Blanket. Absolutely nobody else.' },
      { value: 'out', label: 'Out. Somewhere loud. Now.' },
      { value: 'both', label: 'Depends entirely on the week we had' },
    ],
  },
  {
    id: 'c2',
    text: 'A plan falls through at the last minute.',
    options: [
      { value: 'roll', label: 'Great, improvise' },
      { value: 'plan', label: 'Mildly devastating, I had prepared' },
      { value: 'both', label: 'Annoyed for ten minutes, then fine' },
    ],
  },
  {
    id: 'c3',
    text: 'Conflict style, honestly.',
    options: [
      { value: 'now', label: 'Talk about it immediately' },
      { value: 'later', label: 'Need space first, then talk' },
      { value: 'both', label: 'Depends how big it is' },
    ],
  },
  {
    id: 'c4',
    text: 'Money.',
    options: [
      { value: 'save', label: 'Saver. Always.' },
      { value: 'spend', label: 'Spender. Life is short.' },
      { value: 'both', label: 'Strategic chaos' },
    ],
  },
  {
    id: 'c5',
    text: 'Five years from now.',
    options: [
      { value: 'settled', label: 'Settled, rooted, building something' },
      { value: 'moving', label: 'Somewhere new, doing something different' },
      { value: 'both', label: 'Honestly no idea and that is fine' },
    ],
  },
  {
    id: 'c6',
    text: 'How much time apart is healthy?',
    options: [
      { value: 'lots', label: 'A lot. Separate lives, shared centre.' },
      { value: 'little', label: 'Not much. We are a package.' },
      { value: 'both', label: 'Somewhere in the middle' },
    ],
  },
];

const WHO_IS_MORE_QUESTIONS: QuizQuestion[] = [
  { id: 'w1', text: 'Who texts first, every single time?', options: meOrThem() },
  { id: 'w2', text: 'Who takes longer to get ready?', options: meOrThem() },
  { id: 'w3', text: 'Who apologises first after a fight?', options: meOrThem() },
  { id: 'w4', text: 'Who is more likely to cry at a film?', options: meOrThem() },
  { id: 'w5', text: 'Who remembers the anniversary without checking?', options: meOrThem() },
  { id: 'w6', text: 'Who is more obsessed, be honest?', options: meOrThem() },
];

function meOrThem() {
  return [
    { value: 'me', label: 'Me, obviously' },
    { value: 'them', label: 'Them, obviously' },
  ];
}

export function questionsFor(kind: QuizKind): QuizQuestion[] {
  switch (kind) {
    case 'love_language':
      return LOVE_LANGUAGE_QUESTIONS;
    case 'compatibility':
      return COMPATIBILITY_QUESTIONS;
    case 'who_is_more':
      return WHO_IS_MORE_QUESTIONS;
    default:
      throw new AppError('VALIDATION_ERROR', 'Unknown quiz.', 422);
  }
}

/* ─────────────────────────────────────────────────────────────
   SCORING
   ───────────────────────────────────────────────────────────── */

const LANGUAGE_LABELS: Record<LoveLanguage, string> = {
  words: 'Words of Affirmation',
  acts: 'Acts of Service',
  gifts: 'Receiving Gifts',
  time: 'Quality Time',
  touch: 'Physical Touch',
};

export function scoreLoveLanguage(answers: Record<string, string | number>): {
  language: LoveLanguage;
  label: string;
  tally: Record<LoveLanguage, number>;
} {
  const tally: Record<LoveLanguage, number> = { words: 0, acts: 0, gifts: 0, time: 0, touch: 0 };

  for (const value of Object.values(answers)) {
    if (typeof value === 'string' && value in tally) {
      tally[value as LoveLanguage] += 1;
    }
  }

  const winner = (Object.entries(tally) as Array<[LoveLanguage, number]>).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const language = winner?.[0] ?? 'time';
  return { language, label: LANGUAGE_LABELS[language], tally };
}

/**
 * Compatibility is deliberately generous — this is entertainment,
 * not an assessment. Identical answers score highest, "both" answers
 * count as partial alignment.
 */
export function scoreCompatibility(
  mine: Record<string, string | number>,
  theirs: Record<string, string | number>
): CompatibilityResult {
  const dimensions: Array<{ id: string; label: string }> = [
    { id: 'c1', label: 'Social battery' },
    { id: 'c2', label: 'Plan flexibility' },
    { id: 'c3', label: 'Conflict rhythm' },
    { id: 'c4', label: 'Money instincts' },
    { id: 'c5', label: 'Future vision' },
    { id: 'c6', label: 'Space needs' },
  ];

  const breakdown = dimensions.map(({ id, label }) => {
    const a = mine[id];
    const b = theirs[id];
    let score: number;
    let note: string;

    if (a === undefined || b === undefined) {
      score = 50;
      note = 'One of you skipped this one.';
    } else if (a === b) {
      score = 95;
      note = 'Identical. Slightly suspicious.';
    } else if (a === 'both' || b === 'both') {
      score = 75;
      note = 'One of you flexes. That works.';
    } else {
      score = 55;
      note = 'Opposites. Handle with communication.';
    }

    return { label, score, note };
  });

  const score = Math.round(breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length);

  return {
    score,
    headline: headlineFor(score),
    breakdown,
    verdict: '',
  };
}

function headlineFor(score: number): string {
  if (score >= 90) return 'Alarmingly compatible';
  if (score >= 78) return 'Dangerously in sync';
  if (score >= 65) return 'Different, deliberately';
  if (score >= 55) return 'Opposites, on purpose';
  return 'Chaos, but committed';
}

/* ─────────────────────────────────────────────────────────────
   PERSISTENCE
   ───────────────────────────────────────────────────────────── */

export async function saveQuizResult(input: {
  coupleId: string;
  userId: string;
  kind: QuizKind;
  answers: Record<string, string | number>;
  score?: number | null;
  resultLabel?: string | null;
  aiSummary?: string | null;
}): Promise<QuizResult> {
  const { data, error } = await db
    .from('quiz_results')
    .insert({
      couple_id: input.coupleId,
      user_id: input.userId,
      kind: input.kind,
      answers: input.answers,
      score: input.score ?? null,
      result_label: input.resultLabel ?? null,
      ai_summary: input.aiSummary ?? null,
    })
    .select('*')
    .single<QuizResult>();

  if (error) throw fromPostgrest(error);
  return data;
}

/** Latest result per partner for a given quiz. */
export async function latestResults(coupleId: string, kind: QuizKind): Promise<QuizResult[]> {
  const { data, error } = await db
    .from('quiz_results')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .returns<QuizResult[]>();

  if (error) throw fromPostgrest(error);

  const seen = new Set<string>();
  const latest: QuizResult[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    latest.push(row);
  }
  return latest;
}

export async function setLoveLanguage(userId: string, language: LoveLanguage): Promise<void> {
  const { error } = await db.from('users').update({ love_language: language }).eq('id', userId);
  if (error) throw fromPostgrest(error);
}

export function partnerOf(results: QuizResult[], userId: string): QuizResult | null {
  return results.find((r) => r.user_id !== userId) ?? null;
}

export function mineFrom(results: QuizResult[], userId: string): QuizResult | null {
  return results.find((r) => r.user_id === userId) ?? null;
}

export type { User };
