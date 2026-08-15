'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { Couple, User } from '@real/types';
import { Alert, Badge, Button, Card, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { publicEnv } from '@/lib/env';

/**
 * Public profile controls.
 * Opt-in, reversible, and completely explicit about what does and does not leave.
 */
export default function PublicProfilePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const data = useQuery({
    queryKey: ['couple'],
    queryFn: () => api.get<{ couple: Couple; members: User[] }>('/couple'),
  });

  const toggle = useMutation({
    mutationFn: (isPublic: boolean) => api.patch<Couple>('/couple', { is_public: isPublic }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['couple'] });
      void queryClient.invalidateQueries({ queryKey: ['universe'] });
    },
  });

  if (data.isLoading) return <Skeleton className="h-64" />;

  const couple = data.data?.couple;
  if (!couple) return null;

  const url = couple.slug ? `${publicEnv.siteUrl}/u/${couple.slug}` : null;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Public card</h1>
        <p className="mt-1 text-sm text-ash">Off by default. Yours to switch on.</p>
      </header>

      <Card className={couple.is_public ? 'border-gold/40' : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold">
              {couple.is_public ? 'You are public' : 'You are private'}
            </p>
            <p className="mt-1 text-xs text-ash">
              {couple.is_public
                ? 'Anyone with the link can see your card.'
                : 'Nobody outside this space can see anything.'}
            </p>
          </div>
          <Badge tone={couple.is_public ? 'gold' : 'muted'}>{couple.is_public ? 'ON' : 'OFF'}</Badge>
        </div>

        <Button
          onClick={() => toggle.mutate(!couple.is_public)}
          loading={toggle.isPending}
          variant={couple.is_public ? 'ghost' : 'primary'}
          fullWidth
          className="mt-5"
        >
          {couple.is_public ? 'Go private again' : 'Make us public 🌍'}
        </Button>
      </Card>

      {couple.is_public && url && (
        <Card>
          <p className="label">Your link</p>
          <p className="mt-2 break-all font-mono text-sm text-hot-pink">{url}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={copy} fullWidth>
              {copied ? 'Copied ✓' : 'Copy link'}
            </Button>
            <Link href={`/u/${couple.slug}`} target="_blank">
              <Button variant="ghost">Preview</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="border-purple/25 bg-purple/5">
        <p className="label">What goes public</p>
        <ul className="mt-3 space-y-1.5 text-sm text-blush">
          <li>✓ Ship name, emoji and vibe</li>
          <li>✓ Days together and streak</li>
          <li>✓ Combined Sparks, milestones hit, dares completed</li>
          <li>✓ Both display names and personality tags</li>
        </ul>
        <p className="label mt-5">What never does</p>
        <ul className="mt-3 space-y-1.5 text-sm text-ash">
          <li>✗ Journal entries, private or shared</li>
          <li>✗ Moods, promises, missions, money</li>
          <li>✗ Photos, memories, dare proof</li>
          <li>✗ Anything either of you wrote to the other</li>
        </ul>
      </Card>

      {toggle.error && (
        <Alert tone="error">
          {toggle.error instanceof Error ? toggle.error.message : 'Could not change that.'}
        </Alert>
      )}
    </div>
  );
}
