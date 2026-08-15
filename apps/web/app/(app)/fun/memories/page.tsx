'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { Memory } from '@real/types';
import { formatDatePretty } from '@real/utils';
import { Alert, Button, Card, EmptyState, Field, Input, Skeleton, Textarea } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';

export default function MemoriesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const celebrate = useSparkCelebration();

  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

  const memories = useQuery({
    queryKey: ['memories'],
    queryFn: () => api.get<Memory[]>('/memories'),
  });

  const create = useMutation({
    mutationFn: () => api.post<Memory>('/memories', { caption, memory_date: date }),
    onSuccess: () => {
      celebrate(8);
      setCaption('');
      setAdding(false);
      void queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });

  const count = memories.data?.length ?? 0;
  const fill = Math.min(100, (count / 52) * 100);

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Memory Jar</h1>
        <p className="mt-1 text-sm text-ash">One a week fills it in a year.</p>
      </header>

      <Card glow className="text-center">
        <div className="relative mx-auto h-32 w-24 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-white/20 bg-slate/40">
          <div
            className="absolute inset-x-0 bottom-0 bg-real-gradient transition-all duration-700"
            style={{ height: `${fill}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold">
            {count}
          </span>
        </div>
        <p className="mt-4 text-sm text-ash">
          {count === 0 ? 'Empty. For now.' : `${count} in the jar. ${52 - count > 0 ? `${52 - count} to fill it.` : 'Full. Get a bigger jar.'}`}
        </p>
      </Card>

      {adding ? (
        <Card className="space-y-4">
          {create.error && (
            <Alert tone="error">
              {create.error instanceof Error ? create.error.message : 'Could not save that.'}
            </Alert>
          )}
          <Field label="What happened?">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="The bit you want to remember..."
              maxLength={500}
              autoFocus
            />
          </Field>
          <Field label="When">
            <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={caption.trim().length < 1} fullWidth>
              Into the jar 🫙
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} fullWidth size="lg">
          + Add a memory
        </Button>
      )}

      {memories.isLoading ? (
        <Skeleton className="h-40" />
      ) : count === 0 ? (
        <EmptyState
          emoji="🫙"
          title="Nothing in here yet"
          body="Add the first one. It does not have to be big — most of the good ones are not."
        />
      ) : (
        <ul className="space-y-2">
          {memories.data?.map((memory) => (
            <li key={memory.id} className="card p-4">
              <p className="text-sm leading-relaxed">{memory.caption}</p>
              <p className="mt-2 text-xs text-ash">{formatDatePretty(memory.memory_date)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
