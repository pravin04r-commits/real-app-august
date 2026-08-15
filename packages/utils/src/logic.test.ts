/**
 * R.E.A.L. — logic checks for the rules that decide real outcomes.
 *
 * Streaks, Sparks and pairing codes are the parts users would notice being
 * wrong, so they get tested. No test framework: `npm test` runs this with tsx.
 */

import {
  advanceStreak,
  applySpend,
  calcCheckInSparks,
  daysTogether,
  generateInviteCode,
  moodSyncScore,
  nextAnniversary,
  normalizeInviteCode,
  percent,
  relationshipWeek,
  shipName,
  slugify,
  streakBonus,
} from './index.js';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}\n      got:      ${a}\n      expected: ${e}`);
  }
}

function group(title: string): void {
  console.log(`\n${title}`);
}

/* ── STREAKS ─────────────────────────────────────────────────── */
group('Streaks');

const streakBase = { streak_count: 5, streak_last_date: '2026-08-14', longest_streak: 9 };

check('consecutive day increments', advanceStreak(streakBase, '2026-08-15').streak_count, 6);
check('same day is idempotent', advanceStreak(streakBase, '2026-08-14').streak_count, 5);
check('a missed day resets to 1', advanceStreak(streakBase, '2026-08-18').streak_count, 1);
check('a missed day is flagged broken', advanceStreak(streakBase, '2026-08-18').broken, true);
check(
  'first ever check-in starts at 1',
  advanceStreak({ streak_count: 0, streak_last_date: null, longest_streak: 0 }, '2026-08-15').streak_count,
  1
);
check('personal best survives a reset', advanceStreak(streakBase, '2026-08-20').longest_streak, 9);
check(
  'personal best advances past the record',
  advanceStreak({ streak_count: 9, streak_last_date: '2026-08-14', longest_streak: 9 }, '2026-08-15')
    .longest_streak,
  10
);
check('weekly bonus lands on day 7', streakBonus(7), 25);
check('weekly bonus lands on day 14', streakBonus(14), 25);
check('no bonus on day 8', streakBonus(8), 0);

/* ── SPARKS ──────────────────────────────────────────────────── */
group('Sparks');

check(
  'plain private check-in',
  calcCheckInSparks({ mode: 'private', hasSharedText: false, promiseKept: null, streakCount: 3 }).total,
  10
);
check(
  'sharing adds a bonus',
  calcCheckInSparks({ mode: 'shared', hasSharedText: true, promiseKept: null, streakCount: 3 }).total,
  15
);
check(
  'a kept promise pays 15',
  calcCheckInSparks({ mode: 'private', hasSharedText: false, promiseKept: true, streakCount: 3 }).total,
  25
);
check(
  'a broken promise pays nothing extra',
  calcCheckInSparks({ mode: 'private', hasSharedText: false, promiseKept: false, streakCount: 3 }).total,
  10
);
check(
  'day 7 stacks the streak bonus',
  calcCheckInSparks({ mode: 'private', hasSharedText: false, promiseKept: null, streakCount: 7 }).total,
  35
);
check('spending within balance works', applySpend(100, 40), 60);
check('overspending is refused', applySpend(100, 140), null);
check('spending the exact balance is allowed', applySpend(100, 100), 0);
check('a negative cost is refused', applySpend(100, -50), null);

/* ── PAIRING ─────────────────────────────────────────────────── */
group('Pairing');

const code = generateInviteCode();
check('invite code is 6 characters', code.length, 6);
check('invite code avoids ambiguous glyphs', /[IO01]/.test(code), false);
check('codes are normalised for entry', normalizeInviteCode(' ab-3d f9 '), 'AB3DF9');
check('ship name blends both names', shipName('Pravin', 'Riya'), 'Praya');
check('ship name survives one empty input', shipName('Pravin', ''), 'Pravin');
check('slug strips punctuation', slugify('Pravin & Riya!! 2026'), 'pravin-riya-2026');
check('slug trims trailing dashes', slugify('--Us--'), 'us');

/* ── MOOD ────────────────────────────────────────────────────── */
group('Mood');

check('identical moods read as fully in sync', moodSyncScore([{ log_date: 'd', mine: 4, partner: 4 }]), 100);
check('opposite extremes read as zero', moodSyncScore([{ log_date: 'd', mine: 1, partner: 5 }]), 0);
check('days only one partner logged are ignored', moodSyncScore([{ log_date: 'd', mine: 3, partner: null }]), 0);
check(
  'one point of drift is not catastrophic',
  moodSyncScore([{ log_date: 'd', mine: 4, partner: 3 }]),
  75
);

/* ── DATES ───────────────────────────────────────────────────── */
group('Dates');

check('days together counts calendar days', daysTogether('2026-08-01', new Date('2026-08-15T12:00:00Z')), 14);
check('no start date means no count', daysTogether(null), null);
check('relationship week starts at 1', relationshipWeek('2026-08-15', new Date('2026-08-15T00:00:00Z')), 1);
check('week 2 begins on day 7', relationshipWeek('2026-08-01', new Date('2026-08-08T00:00:00Z')), 2);

const anniversary = nextAnniversary('2024-09-01', new Date('2026-08-15T00:00:00Z'));
check('next anniversary is labelled in years', anniversary?.label, '2 years');
check('next anniversary counts days away', anniversary?.days_away, 17);

/* ── MISC ────────────────────────────────────────────────────── */
group('Progress');

check('progress is a clamped percentage', percent(50, 200), 25);
check('progress never exceeds 100', percent(500, 200), 100);
check('a zero target does not divide by zero', percent(50, 0), 0);

/* ── RESULT ──────────────────────────────────────────────────── */
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
