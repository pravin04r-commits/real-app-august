'use client';

import Link from 'next/link';
import { MOOD_EMOJI, MOOD_LABELS } from '@real/types';
import { formatSparks, percent, pluralize } from '@real/utils';
import { Badge, Card, EmptyState, ProgressBar, Skeleton, Stat } from '@/components/ui';
import { useUniverse } from '@/hooks/useUniverse';
import { PartnerSeatCard } from '@/components/dashboard/PartnerSeatCard';

/**
 * The Universe — the couple's HQ.
 * One request, everything on screen. This is the first thing they see
 * every day, so it has to land instantly and feel like a win.
 */
export default function UniversePage() {
  const { data, isLoading, error } = useUniverse();

  if (isLoading) return <UniverseSkeleton />;

  if (error || !data) {
    return (
      <EmptyState
        emoji="🛰️"
        title="Lost signal"
        body="We could not load your universe. Pull to refresh, or check your connection."
      />
    );
  }

  const { couple, me, partner, streak, sparks, today_mood, active_dare, days_together } = data;
  const accent = couple.aesthetic?.color ?? '#FF2D6B';

  return (
    <div className="space-y-4 pb-6" style={{ ['--couple-accent' as string]: accent }}>
      <section className="pt-2 text-center">
        <div className="animate-heartbeat text-5xl">{couple.aesthetic?.emoji ?? '🔥'}</div>
        <h1 className="mt-3 font-display text-3xl font-extrabold">
          <span className="text-gradient">{couple.ship_name}</span>
        </h1>
        {days_together !== null && (
          <p className="mt-1 text-sm text-ash">
            Day <span className="font-mono text-blush">{days_together.toLocaleString()}</span> of
            whatever this is
          </p>
        )}
      </section>

      {data.next_anniversary && data.next_anniversary.days_away <= 60 && (
        <Card glow className="text-center">
          <p className="label">Coming up</p>
          <p className="mt-2 font-display text-xl font-bold text-gold">
            {data.next_anniversary.label} in {data.next_anniversary.days_away}{' '}
            {pluralize(data.next_anniversary.days_away, 'day')}
          </p>
          <p className="mt-1 text-xs text-ash">Start planning. Do not wing it.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Streak"
          value={`${streak.current}🔥`}
          sub={streak.longest > streak.current ? `Best: ${streak.longest}` : 'Personal best'}
        />
        <Stat
          label="Sparks together"
          value={formatSparks(sparks.combined)}
          sub={`You ${formatSparks(sparks.mine)} · Them ${formatSparks(sparks.partner)}`}
          accent="gold"
        />
      </div>

      {!streak.logged_today && (
        <Link href="/reality" className="block">
          <Card glow className="flex items-center gap-4 border-hot-pink/40">
            <span className="animate-float text-3xl">📓</span>
            <div className="flex-1">
              <p className="font-display text-lg font-bold">Check in today</p>
              <p className="text-xs text-ash">
                {streak.current > 0
                  ? `Do not be the one who breaks a ${streak.current}-day streak.`
                  : 'This is how it starts.'}
              </p>
            </div>
            <span className="text-hot-pink">→</span>
          </Card>
        </Link>
      )}

      <Card>
        <p className="label">Mood sync · today</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MoodTile name={me.display_name ?? 'You'} score={today_mood.mine} isYou />
          <MoodTile name={partner?.display_name ?? 'Them'} score={today_mood.partner} />
        </div>
      </Card>

      {active_dare && (
        <Link href="/dares" className="block">
          <Card className="card-hover border-purple/30">
            <div className="flex items-center justify-between">
              <p className="label">This week&apos;s dare</p>
              <Badge tone="purple">{active_dare.spark_reward} ✨ each</Badge>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">{active_dare.prompt_text}</p>
          </Card>
        </Link>
      )}

      {data.active_missions.length > 0 && (
        <Card>
          <p className="label">Missions</p>
          <div className="mt-4 space-y-4">
            {data.active_missions.slice(0, 3).map((mission) => {
              const progress = percent(Number(mission.saved_amount), Number(mission.target_amount));
              return (
                <div key={mission.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {mission.emoji} {mission.name}
                    </span>
                    <span className="font-mono text-xs text-ash">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} className="mt-2" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {data.recent_milestones.length > 0 && (
        <Card>
          <p className="label">Recent milestones</p>
          <ul className="mt-4 space-y-3">
            {data.recent_milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-start gap-3">
                <span className="text-lg">{milestone.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{milestone.title}</p>
                  <p className="text-xs text-ash">{milestone.milestone_date}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!partner && <PartnerSeatCard couple={couple} />}
    </div>
  );
}

function MoodTile({
  name,
  score,
  isYou,
}: {
  name: string;
  score: number | null;
  isYou?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate/40 p-4 text-center">
      <p className="truncate text-xs text-ash">{name}</p>
      <p className="mt-2 text-3xl">{score ? MOOD_EMOJI[score] : '⚪'}</p>
      <p className="mt-1 text-xs text-ash">
        {score ? MOOD_LABELS[score] : isYou ? 'Not yet' : 'Waiting on them'}
      </p>
    </div>
  );
}

function UniverseSkeleton() {
  return (
    <div className="space-y-4 pt-6">
      <Skeleton className="mx-auto h-14 w-14 rounded-full" />
      <Skeleton className="mx-auto h-8 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-28" />
    </div>
  );
}
