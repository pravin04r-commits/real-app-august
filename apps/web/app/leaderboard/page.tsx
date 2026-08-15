import type { Metadata } from 'next';
import Link from 'next/link';
import type { LeaderboardEntry } from '@real/types';
import { formatSparks } from '@real/utils';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Opt-in couples, ranked by streak. Entirely voluntary. Slightly competitive.',
};

export const revalidate = 120;

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await apiFetch<LeaderboardEntry[]>('/public/leaderboard?limit=25');
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <header className="text-center">
        <h1 className="font-display text-4xl font-extrabold">
          <span className="text-gold-gradient">Leaderboard</span>
        </h1>
        <p className="mt-2 text-sm text-ash">
          Opt-in only. Ranked by streak, then Sparks. Nobody is here who did not choose to be.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-4 font-display text-lg font-bold">Nobody has gone public yet</p>
          <p className="mt-2 text-sm text-ash">
            Be the first. Turn on your public card and take the top spot by default.
          </p>
        </div>
      ) : (
        <ol className="mt-10 space-y-2">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/u/${entry.slug}`}
                className="card card-hover flex items-center gap-4 p-4"
              >
                <span className="w-8 text-center font-display text-xl font-extrabold text-ash">
                  {entry.rank === 1 ? '👑' : entry.rank}
                </span>
                <span className="text-2xl">{entry.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold">{entry.ship_name}</p>
                  <p className="text-xs text-ash">
                    {entry.days_together?.toLocaleString() ?? 0} days together
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-hot-pink">{entry.streak_count}🔥</p>
                  <p className="font-mono text-[11px] text-gold">
                    {formatSparks(entry.combined_sparks)} ✨
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/signup"
          className="inline-block rounded-full bg-real-gradient px-7 py-3 font-semibold text-white shadow-glow"
        >
          Get on this list 🔥
        </Link>
      </div>
    </main>
  );
}
