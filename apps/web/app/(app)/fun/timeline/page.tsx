'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { Milestone } from '@real/types';
import { formatDatePretty } from '@real/utils';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';

const EMOJI_CHOICES = ['✨', '💥', '✈️', '🏠', '💍', '🎂', '🎓', '🐕', '🌊', '🔥'];

export default function TimelinePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const celebrate = useSparkCelebration();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [emoji, setEmoji] = useState('✨');
  const [adding, setAdding] = useState(false);

  const milestones = useQuery({
    queryKey: ['milestones'],
    queryFn: () => api.get<Milestone[]>('/milestones'),
  });

  const create = useMutation({
    mutationFn: () => api.post<Milestone>('/milestones', { title, milestone_date: date, emoji }),
    onSuccess: () => {
      celebrate(20);
      setTitle('');
      setAdding(false);
      void queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Milestone Wall</h1>
        <p className="mt-1 text-sm text-ash">Everything that happened, in order.</p>
      </header>

      {adding ? (
        <Card className="space-y-4">
          {create.error && (
            <Alert tone="error">
              {create.error instanceof Error ? create.error.message : 'Could not save that.'}
            </Alert>
          )}
          <Field label="What was it?">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="First trip together"
              maxLength={80}
              autoFocus
            />
          </Field>
          <Field label="When">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div>
            <span className="label mb-2 block">Mark it</span>
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  onClick={() => setEmoji(choice)}
                  className={`rounded-xl border px-3 py-2 text-xl transition-all ${
                    emoji === choice ? 'border-hot-pink bg-hot-pink/12' : 'border-white/10 bg-slate/40'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={title.trim().length < 2} fullWidth>
              Mark it ✨
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} fullWidth size="lg">
          + Add a milestone
        </Button>
      )}

      {milestones.isLoading ? (
        <Skeleton className="h-40" />
      ) : !milestones.data || milestones.data.length === 0 ? (
        <EmptyState emoji="🗺️" title="Blank timeline" body="Add the first one. Start at day one." />
      ) : (
        <ol className="relative space-y-4 border-l border-white/12 pl-6">
          {milestones.data.map((milestone) => (
            <li key={milestone.id} className="relative">
              <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-midnight text-xs">
                {milestone.emoji}
              </span>
              <div className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-bold">{milestone.title}</p>
                  {milestone.is_auto && <Badge tone="muted">auto</Badge>}
                </div>
                {milestone.description && (
                  <p className="mt-1 text-xs leading-relaxed text-ash">{milestone.description}</p>
                )}
                <p className="mt-2 text-xs text-ash">{formatDatePretty(milestone.milestone_date)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
