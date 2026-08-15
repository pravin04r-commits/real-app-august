import { Router } from 'express';
import { z } from 'zod';
import type { LeaderboardEntry, PublicCoupleCard } from '@real/types';
import { daysTogether } from '@real/utils';
import { db } from '../db/supabase.js';
import { AppError, fromPostgrest } from '../lib/errors.js';
import { handler, ok } from '../lib/http.js';
import { validate } from '../middleware/validate.js';

export const publicRouter = Router();

interface CardRow {
  id: string;
  slug: string;
  ship_name: string | null;
  aesthetic: { color: string; vibe: string; emoji: string } | null;
  start_date: string | null;
  streak_count: number;
  longest_streak: number;
  created_at: string;
  combined_sparks: number;
  milestones_hit: number;
  dares_completed: number;
}

/**
 * GET /public/couple/:slug — an opt-in public card.
 *
 * This endpoint is deliberately narrow. It returns streaks, Sparks and
 * display names. It never returns journals, moods, promises, missions,
 * or anything either partner marked private.
 */
publicRouter.get(
  '/couple/:slug',
  handler(async (req, res) => {
    const slug = req.params.slug as string;

    const { data: card, error } = await db
      .from('public_couple_cards')
      .select('*')
      .eq('slug', slug)
      .maybeSingle<CardRow>();

    if (error) throw fromPostgrest(error);
    if (!card) throw AppError.notFound('No public card at that address.');

    const { data: partners, error: partnersError } = await db
      .from('users')
      .select('display_name, avatar_url, personality_tag')
      .eq('couple_id', card.id)
      .returns<Array<{ display_name: string | null; avatar_url: string | null; personality_tag: string | null }>>();

    if (partnersError) throw fromPostgrest(partnersError);

    const payload: PublicCoupleCard = {
      ship_name: card.ship_name ?? 'Unnamed',
      slug: card.slug,
      emoji: card.aesthetic?.emoji ?? '🔥',
      color: card.aesthetic?.color ?? '#FF2D6B',
      vibe: card.aesthetic?.vibe ?? null,
      days_together: daysTogether(card.start_date),
      streak_count: card.streak_count,
      longest_streak: card.longest_streak,
      combined_sparks: card.combined_sparks,
      milestones_hit: card.milestones_hit,
      dares_completed: card.dares_completed,
      partners: (partners ?? []).map((p) => ({
        display_name: p.display_name ?? 'Partner',
        avatar_url: p.avatar_url,
        personality_tag: p.personality_tag,
      })),
      member_since: card.created_at,
    };

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    ok(res, payload);
  })
);

interface LeaderboardRow {
  rank: number;
  slug: string;
  ship_name: string | null;
  aesthetic: { color: string; vibe: string; emoji: string } | null;
  streak_count: number;
  combined_sparks: number;
  start_date: string | null;
}

/** GET /public/leaderboard — opt-in couples only, ranked by streak. */
publicRouter.get(
  '/leaderboard',
  validate(z.object({ limit: z.coerce.number().int().min(1).max(100).default(25) }), 'query'),
  handler(async (req, res) => {
    const { limit } = req.query as unknown as { limit: number };

    const { data, error } = await db
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit)
      .returns<LeaderboardRow[]>();

    if (error) throw fromPostgrest(error);

    const entries: LeaderboardEntry[] = (data ?? []).map((row) => ({
      rank: Number(row.rank),
      slug: row.slug,
      ship_name: row.ship_name ?? 'Unnamed',
      emoji: row.aesthetic?.emoji ?? '🔥',
      streak_count: row.streak_count,
      combined_sparks: row.combined_sparks,
      days_together: daysTogether(row.start_date),
    }));

    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    ok(res, entries);
  })
);
