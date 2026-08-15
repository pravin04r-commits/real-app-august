'use client';

import { useState } from 'react';
import type { Couple } from '@real/types';
import { Button } from '@/components/ui';

/** The one-time invite code screen. Exactly one seat left, and this opens it. */
export function InviteCard({ couple, onContinue }: { couple: Couple; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!couple.invite_code) return;
    try {
      await navigator.clipboard.writeText(couple.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (!couple.invite_code) return;
    const text = `Join our R.E.A.L. universe. Code: ${couple.invite_code}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'R.E.A.L.', text });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    void copy();
  }

  return (
    <div className="animate-fade-up text-center">
      <div className="animate-heartbeat text-6xl">{couple.aesthetic?.emoji ?? '🔥'}</div>
      <h1 className="mt-6 font-display text-3xl font-extrabold">
        <span className="text-gradient">{couple.ship_name}</span> exists
      </h1>
      <p className="mt-2 text-sm text-ash">
        One seat left. Send this code to your person — it works exactly once.
      </p>

      <div className="card mt-8 border-hot-pink/30 p-8 shadow-glow">
        <p className="label">Couple code</p>
        <p className="mt-3 font-mono text-4xl font-bold tracking-[0.35em] text-gold">
          {couple.invite_code}
        </p>
        <p className="mt-4 text-xs text-ash">Expires in 48 hours.</p>
      </div>

      <div className="mt-6 space-y-3">
        <Button onClick={share} fullWidth size="lg">
          {copied ? 'Copied ✓' : 'Send it to them 💌'}
        </Button>
        <Button onClick={onContinue} variant="ghost" fullWidth>
          Go to our universe
        </Button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ash">
        Once they claim it, the code dies. Nobody else can ever join this space.
      </p>
    </div>
  );
}
