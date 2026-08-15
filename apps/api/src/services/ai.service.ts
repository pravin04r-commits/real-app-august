import Anthropic from '@anthropic-ai/sdk';
import type { Couple, LoveLanguage, ReportCardStats, User } from '@real/types';
import { aiEnabled, env } from '../config/env.js';
import { log } from '../lib/logger.js';

const MODEL = 'claude-sonnet-4-5';

const client = aiEnabled ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY as string }) : null;

/**
 * The R.E.A.L. Intelligence Engine voice.
 * Witty, dramatic, warm — and never a therapist.
 */
const VOICE = `You are the R.E.A.L. Intelligence Engine — the AI behind a couples-only app
called R.E.A.L. (Relationships Ex's Artificial Language).

Your voice: witty, a little dramatic, warm, smart. Playful but never childish.
Romantic but never cringe. You make people laugh while they use you.

Hard rules:
- You are NOT a therapist. Never diagnose. Never treat serious distress lightly.
- If something suggests abuse, crisis, or real harm, drop the humour entirely and
  gently point toward a professional or a trusted person.
- Never mock, demean, or take sides against either partner.
- Never compare this couple unfavourably to others.
- Keep it short. Nobody reads a wall of text on their phone.`;

export class AIUnavailableError extends Error {
  constructor() {
    super('AI is not configured');
    this.name = 'AIUnavailableError';
  }
}

async function complete(system: string, prompt: string, maxTokens = 500): Promise<string> {
  if (!client) throw new AIUnavailableError();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Empty AI response');
  return text;
}

export interface DareSuggestion {
  prompt_text: string;
  category: string;
  spark_reward: number;
}

/** Generate this week's dare, tuned to the couple's actual situation. */
export async function generateDare(couple: Couple, weekNumber: number, recent: string[]): Promise<DareSuggestion> {
  const avoid = recent.length ? `\nDo NOT repeat these recent dares:\n${recent.map((r) => `- ${r}`).join('\n')}` : '';

  const raw = await complete(
    VOICE,
    `Write ONE weekly dare for this couple.

Couple context:
- Ship name: ${couple.ship_name ?? 'unnamed'}
- Together since: ${couple.start_date ?? 'unknown'}
- Status: ${couple.relationship_type ?? 'unspecified'}
- Distance: ${couple.distance_type === 'long_distance' ? 'long distance' : 'same city'}
- Week ${weekNumber} of using R.E.A.L.
- Current streak: ${couple.streak_count} days${avoid}

The dare must be doable within 7 days, specific, and slightly bold.
If they are long distance, it must not require being in the same room.

Respond with ONLY a JSON object, no markdown fence:
{"prompt_text": "...", "category": "one word", "spark_reward": 40}
spark_reward is between 30 and 80 based on effort.`,
    400
  );

  const parsed = safeJson<DareSuggestion>(raw);
  if (!parsed?.prompt_text) throw new Error('Malformed dare response');

  return {
    prompt_text: parsed.prompt_text,
    category: parsed.category ?? 'connection',
    spark_reward: clampReward(parsed.spark_reward),
  };
}

/** Cross-map both partners' love languages into something actionable. */
export async function loveLanguageInsight(
  me: Pick<User, 'display_name' | 'love_language'>,
  partner: Pick<User, 'display_name' | 'love_language'>
): Promise<string> {
  return complete(
    VOICE,
    `Cross-map these two love languages and give practical, specific advice.

${me.display_name ?? 'Partner A'} gives and receives love through: ${languageLabel(me.love_language)}
${partner.display_name ?? 'Partner B'} gives and receives love through: ${languageLabel(partner.love_language)}

Write 3 short paragraphs max:
1. Where they naturally click (be specific, not generic)
2. Where they will misread each other — the exact moment it happens
3. One concrete thing each of them can do this week

No headers. No bullet points. Conversational. Under 200 words.`,
    600
  );
}

/** Turn a month of activity into a graded report card with personality. */
export async function monthlyReportCard(
  couple: Couple,
  stats: ReportCardStats
): Promise<{ grade: string; headline: string; body: string }> {
  const raw = await complete(
    VOICE,
    `Grade this couple's month. Be honest but kind — encouraging, never harsh.

${couple.ship_name ?? 'This couple'}, together since ${couple.start_date ?? 'a while ago'}.

This month:
- Check-ins logged: ${stats.checkins}
- Dares completed: ${stats.dares_completed}
- Sparks earned: ${stats.sparks_earned}
- Average mood: ${stats.avg_mood} / 5
- Memories added: ${stats.memories_added}
- Longest streak: ${stats.longest_streak} days

Respond with ONLY a JSON object, no markdown fence:
{"grade": "A-", "headline": "one punchy line under 10 words", "body": "2 short paragraphs, under 150 words total"}`,
    700
  );

  const parsed = safeJson<{ grade: string; headline: string; body: string }>(raw);
  if (!parsed?.grade) throw new Error('Malformed report card response');
  return parsed;
}

/** A gentle, non-clinical reflection on a journal entry. */
export async function journalInsight(entryText: string, moodScore: number): Promise<string> {
  return complete(
    VOICE,
    `Someone wrote this in their private relationship journal today. Their mood: ${moodScore}/5.

"${entryText.slice(0, 1500)}"

Respond in under 80 words. Reflect one thing back that they might not have named themselves,
and offer one small, doable next step. Do not diagnose. Do not use therapy language.
If this reads like real distress, drop all humour and gently suggest talking to someone they trust.`,
    300
  );
}

/** Over-the-top compatibility verdict. Entertainment, not science — say so. */
export async function compatibilityVerdict(
  score: number,
  breakdown: Array<{ label: string; score: number }>
): Promise<string> {
  return complete(
    VOICE,
    `Deliver a dramatic verdict on a compatibility score of ${score}/100.

Breakdown: ${breakdown.map((b) => `${b.label} ${b.score}/100`).join(', ')}

Under 60 words. Theatrical. Funny. Warm at the end. This is entertainment and both
of them know it — never imply it is a real assessment of their relationship.`,
    250
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

function languageLabel(l: LoveLanguage | null): string {
  const map: Record<LoveLanguage, string> = {
    words: 'words of affirmation',
    acts: 'acts of service',
    gifts: 'receiving gifts',
    time: 'quality time',
    touch: 'physical touch',
  };
  return l ? map[l] : 'not yet chosen';
}

function clampReward(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 40;
  return Math.min(80, Math.max(30, Math.round(n)));
}

function safeJson<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      log.warn('AI returned unparseable JSON', { preview: cleaned.slice(0, 120) });
      return null;
    }
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export { aiEnabled };
