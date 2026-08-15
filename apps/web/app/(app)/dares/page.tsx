'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { useState } from 'react';
import type { Dare } from '@real/types';
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';

/**
 * Dares — one active at a time, seven days to do it.
 * Completing pays BOTH partners. A dare is joint work; paying only the
 * person who tapped the button would quietly make it a competition.
 */
export default function DaresPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const celebrate = useSparkCelebration();
  const [justEarned, setJustEarned] = useState<number | null>(null);

  const active = useQuery({
    queryKey: ['dares', 'active'],
    queryFn: () => api.get<Dare | null>('/dares/active'),
  });

  const history = useQuery({
    queryKey: ['dares', 'history'],
    queryFn: () => api.get<Dare[]>('/dares/history?limit=20'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['dares'] });
    void queryClient.invalidateQueries({ queryKey: ['universe'] });
  };

  const newDare = useMutation({
    mutationFn: () => api.post<Dare>('/dares/new'),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.post<{ sparks_each: number }>(`/dares/${id}/complete`),
    onSuccess: (data) => {
      setJustEarned(data.sparks_each);
      celebrate(data.sparks_each);
      invalidate();
    },
  });

  const skip = useMutation({
    mutationFn: (id: string) => api.post<Dare>(`/dares/${id}/skip`),
    onSuccess: invalidate,
  });

  const dare = active.data;

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-extrabold">Dares</h1>
        <p className="mt-1 text-sm text-ash">One a week. Seven days. Both of you get paid.</p>
      </header>

      {justEarned !== null && (
        <Card glow className="border-gold/40 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 font-display text-xl font-bold text-gold">
            +{justEarned} Sparks each
          </p>
          <p className="mt-1 text-sm text-ash">Logged. Next one lands when you ask for it.</p>
        </Card>
      )}

      {active.isLoading ? (
        <Skeleton className="h-52" />
      ) : dare ? (
        <Card glow className="border-purple/40">
          <div className="flex items-center justify-between">
            <Badge tone="purple">Week {dare.week_number}</Badge>
            <Badge tone="gold">{dare.spark_reward} ✨ each</Badge>
          </div>

          <p className="mt-5 font-display text-xl leading-relaxed">{dare.prompt_text}</p>

          {dare.category && (
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ash">{dare.category}</p>
          )}

          <p className="mt-4 text-xs text-ash">
            Expires in {formatDistanceToNowStrict(new Date(dare.expires_at))}.
          </p>

          {complete.error && (
            <Alert tone="error">
              {complete.error instanceof Error ? complete.error.message : 'Could not save that.'}
            </Alert>
          )}

          <div className="mt-6 space-y-2">
            <Button
              onClick={() => complete.mutate(dare.id)}
              loading={complete.isPending}
              fullWidth
              size="lg"
            >
              Hell yeah, we did it 🔥
            </Button>
            <Button
              onClick={() => skip.mutate(dare.id)}
              loading={skip.isPending}
              variant="ghost"
              fullWidth
            >
              Not this one
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="animate-float text-4xl">🎯</p>
          <p className="mt-4 font-display text-xl font-bold">No dare running</p>
          <p className="mt-2 text-sm text-ash">
            Ask for one. It gets written for your actual situation — not a generic list.
          </p>
          {newDare.error && (
            <Alert tone="error">
              {newDare.error instanceof Error ? newDare.error.message : 'Could not fetch a dare.'}
            </Alert>
          )}
          <Button
            onClick={() => {
              setJustEarned(null);
              newDare.mutate();
            }}
            loading={newDare.isPending}
            fullWidth
            size="lg"
            className="mt-6"
          >
            Give us a dare 🎲
          </Button>
        </Card>
      )}

      <section>
        <h2 className="label mb-3">History</h2>
        {history.isLoading ? (
          <Skeleton className="h-32" />
        ) : history.data && history.data.length > 0 ? (
          <ul className="space-y-2">
            {history.data.map((item) => (
              <li key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm leading-relaxed text-ash">{item.prompt_text}</p>
                  <Badge tone={item.status === 'completed' ? 'gold' : 'muted'}>
                    {item.status === 'completed' ? '✓' : item.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            emoji="📜"
            title="Nothing behind you yet"
            body="Complete your first dare and it lands here as proof."
          />
        )}
      </section>
    </div>
  );
}
