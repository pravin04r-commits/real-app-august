'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict, isPast } from 'date-fns';
import { useState } from 'react';
import type { Couple } from '@real/types';
import { Alert, Button, Card } from '@/components/ui';
import { useApi } from '@/hooks/useApi';

/**
 * The empty-seat card.
 *
 * Shown on the dashboard whenever the second seat is unclaimed. Without this
 * the invite code is only ever visible once, on the setup screen — leave that
 * page and there is no way back to it.
 */
export function PartnerSeatCard({ couple }: { couple: Couple }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const refresh = useMutation({
    mutationFn: () => api.post<Couple>('/couple/invite/refresh'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['universe'] }),
  });

  const code = couple.invite_code;
  const expired = couple.invite_expires_at ? isPast(new Date(couple.invite_expires_at)) : false;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (!code) return;
    const text = `Join our R.E.A.L. universe. Code: ${code}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'R.E.A.L.', text });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    void copy();
  }

  return (
    <Card className="border-gold/30 bg-gold/5 text-center">
      <p className="animate-float text-3xl">🪑</p>
      <p className="mt-3 font-display text-lg font-bold">One empty seat</p>
      <p className="mt-1 text-sm text-ash">
        Everything stays a bit quiet until they claim it.
      </p>

      {code && !expired ? (
        <>
          <div className="mt-5 rounded-xl border border-white/12 bg-midnight/60 py-4">
            <p className="label">Their code</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-gold">{code}</p>
            {couple.invite_expires_at && (
              <p className="mt-2 text-xs text-ash">
                Expires in {formatDistanceToNowStrict(new Date(couple.invite_expires_at))}
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={share} fullWidth>
              {copied ? 'Copied ✓' : 'Send it to them 💌'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => refresh.mutate()}
              loading={refresh.isPending}
              aria-label="Generate a new code"
            >
              New code
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-5 text-sm text-ash">
            {expired ? 'That code expired. Make a fresh one.' : 'No active code right now.'}
          </p>
          <Button
            onClick={() => refresh.mutate()}
            loading={refresh.isPending}
            fullWidth
            className="mt-4"
          >
            Generate a code 🔑
          </Button>
        </>
      )}

      {refresh.error && (
        <div className="mt-3">
          <Alert tone="error">
            {refresh.error instanceof Error ? refresh.error.message : 'Could not make a code.'}
          </Alert>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ash">
        They sign up with their own email, then enter this code. It works once, then dies.
      </p>
    </Card>
  );
}
