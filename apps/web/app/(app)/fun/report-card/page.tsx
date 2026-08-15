'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReportCard } from '@real/types';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';

export default function ReportCardPage() {
  const api = useApi();

  const card = useQuery({
    queryKey: ['report-card'],
    queryFn: () => api.get<ReportCard>('/ai/report-card'),
  });

  if (card.isLoading) return <Skeleton className="h-80" />;

  if (card.error || !card.data) {
    return (
      <div className="pt-8 text-center">
        <p className="text-4xl">📊</p>
        <p className="mt-4 text-sm text-ash">
          Could not build your report card right now. Try again in a moment.
        </p>
      </div>
    );
  }

  const { grade, headline, body, stats, period_start, period_end } = card.data;

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Report Card</h1>
        <p className="mt-1 text-sm text-ash">
          {period_start} → {period_end}
        </p>
      </header>

      <Card glow className="text-center">
        <p className="label">Grade</p>
        <p className="mt-2 font-display text-7xl font-extrabold text-gold-gradient">{grade}</p>
        <p className="mt-3 font-display text-xl font-bold">{headline}</p>
      </Card>

      <Card>
        <p className="whitespace-pre-line text-sm leading-relaxed">{body}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Check-ins" value={stats.checkins} />
        <MiniStat label="Dares done" value={stats.dares_completed} />
        <MiniStat label="Sparks earned" value={stats.sparks_earned} />
        <MiniStat label="Avg mood" value={`${stats.avg_mood}/5`} />
        <MiniStat label="Memories" value={stats.memories_added} />
        <MiniStat label="Best streak" value={`${stats.longest_streak}🔥`} />
      </div>

      <Button variant="ghost" fullWidth onClick={() => card.refetch()}>
        Regenerate
      </Button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
