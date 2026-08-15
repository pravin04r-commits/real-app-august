'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { Mission } from '@real/types';
import { formatCurrency, formatDatePretty, percent } from '@real/utils';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, ProgressBar, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';

/** Missions — shared goals with money attached. The trip you keep talking about. */
export default function MissionsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const celebrate = useSparkCelebration();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState(10000);
  const [deadline, setDeadline] = useState('');

  const missions = useQuery({
    queryKey: ['missions'],
    queryFn: () => api.get<Mission[]>('/missions'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['missions'] });
    void queryClient.invalidateQueries({ queryKey: ['universe'] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.post<Mission>('/missions', {
        name,
        emoji,
        target_amount: target,
        deadline: deadline || undefined,
      }),
    onSuccess: () => {
      setName('');
      setAdding(false);
      invalidate();
    },
  });

  const contribute = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post<{ completed: boolean }>(`/missions/${id}/contribute`, { amount }),
    onSuccess: () => {
      celebrate(10);
      invalidate();
    },
  });

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Missions</h1>
        <p className="mt-1 text-sm text-ash">
          The trip, the ring, the deposit. Money goals you are both actually watching.
        </p>
      </header>

      {adding ? (
        <Card className="space-y-4">
          {create.error && (
            <Alert tone="error">
              {create.error instanceof Error ? create.error.message : 'Could not save that.'}
            </Alert>
          )}
          <Field label="What are you saving for?">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goa, December"
              maxLength={60}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji">
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4} />
            </Field>
            <Field label="Target (₹)">
              <Input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Deadline" hint="Optional, but deadlines work.">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={name.trim().length < 2 || target <= 0}
              fullWidth
            >
              Start the mission 🎯
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} fullWidth size="lg">
          + New mission
        </Button>
      )}

      {missions.isLoading ? (
        <Skeleton className="h-40" />
      ) : !missions.data || missions.data.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="No missions yet"
          body="Pick the thing you keep talking about and put a number on it. Numbers make it real."
        />
      ) : (
        <div className="space-y-3">
          {missions.data.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onContribute={(amount) => contribute.mutate({ id: mission.id, amount })}
              pending={contribute.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MissionCard({
  mission,
  onContribute,
  pending,
}: {
  mission: Mission;
  onContribute: (amount: number) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState(500);
  const saved = Number(mission.saved_amount);
  const targetAmount = Number(mission.target_amount);
  const progress = percent(saved, targetAmount);
  const done = mission.status === 'completed';

  return (
    <Card className={done ? 'border-gold/40' : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mission.emoji ?? '🎯'}</span>
          <div>
            <p className="font-display text-base font-bold">{mission.name}</p>
            {mission.deadline && (
              <p className="text-xs text-ash">by {formatDatePretty(mission.deadline)}</p>
            )}
          </div>
        </div>
        {done && <Badge tone="gold">Done ✓</Badge>}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="font-mono text-blush">{formatCurrency(saved, mission.currency)}</span>
          <span className="font-mono text-ash">{formatCurrency(targetAmount, mission.currency)}</span>
        </div>
        <ProgressBar value={progress} className="mt-2" />
        <p className="mt-1 text-right text-xs text-ash">{progress}%</p>
      </div>

      {!done && (
        <div className="mt-4 flex gap-2">
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1"
            aria-label="Contribution amount"
          />
          <Button size="sm" loading={pending} onClick={() => onContribute(amount)} disabled={amount <= 0}>
            Add
          </Button>
        </div>
      )}
    </Card>
  );
}
