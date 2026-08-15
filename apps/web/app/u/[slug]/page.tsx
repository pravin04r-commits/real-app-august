import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicCoupleCard } from '@real/types';
import { formatSparks } from '@real/utils';
import { apiFetch } from '@/lib/api';

interface PageProps {
  params: { slug: string };
}

async function getCard(slug: string): Promise<PublicCoupleCard | null> {
  try {
    return await apiFetch<PublicCoupleCard>(`/public/couple/${slug}`, {
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const card = await getCard(params.slug);
  if (!card) return { title: 'Not found' };

  return {
    title: `${card.ship_name} on R.E.A.L.`,
    description: `${card.streak_count}-day streak, ${formatSparks(card.combined_sparks)} Sparks and counting.`,
    openGraph: {
      title: `${card.emoji} ${card.ship_name}`,
      description: `${card.days_together ?? 0} days together. ${card.streak_count}-day streak.`,
    },
  };
}

/** The shareable card. Screenshot-ready by design. */
export default async function PublicCouplePage({ params }: PageProps) {
  const card = await getCard(params.slug);
  if (!card) notFound();

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <section
        className="card overflow-hidden p-8 text-center"
        style={{ borderColor: `${card.color}55`, boxShadow: `0 0 42px -14px ${card.color}` }}
      >
        <div className="animate-heartbeat text-6xl">{card.emoji}</div>

        <h1 className="mt-5 font-display text-4xl font-extrabold" style={{ color: card.color }}>
          {card.ship_name}
        </h1>

        {card.vibe && (
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-ash">{card.vibe}</p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <PublicStat label="Days together" value={(card.days_together ?? 0).toLocaleString()} />
          <PublicStat label="Streak" value={`${card.streak_count}🔥`} />
          <PublicStat label="Sparks" value={formatSparks(card.combined_sparks)} />
          <PublicStat label="Dares done" value={card.dares_completed} />
        </div>

        <div className="mt-8 flex justify-center gap-8">
          {card.partners.map((partner) => (
            <div key={partner.display_name}>
              <p className="font-display text-base font-bold">{partner.display_name}</p>
              {partner.personality_tag && (
                <p className="mt-0.5 text-[11px] text-ash">{partner.personality_tag}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-ash/60">
          Certified R.E.A.L. couple
        </p>
      </section>

      <div className="mt-8 text-center">
        <p className="text-sm text-ash">Want one of these?</p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-full bg-real-gradient px-7 py-3 font-semibold text-white shadow-glow"
        >
          Start your universe 🔥
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/leaderboard" className="text-xs text-ash hover:text-hot-pink">
          See the leaderboard →
        </Link>
      </div>
    </main>
  );
}

function PublicStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate/40 p-4">
      <p className="label">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
