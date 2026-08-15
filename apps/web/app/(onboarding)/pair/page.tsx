'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Couple } from '@real/types';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * The pairing gate. Two paths: create a space, or claim the second seat.
 * A code can be used exactly once — the API nulls it the moment it lands.
 */
export default function PairPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');

  return (
    <div className="animate-fade-up">
      <p className="label">Step 2 of 2</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold">
        {mode === 'choose' ? 'Two of you. Not three.' : 'Enter their code'}
      </h1>
      <p className="mt-2 text-sm text-ash">
        {mode === 'choose'
          ? 'One of you creates the space. The other claims the only remaining seat.'
          : 'Six characters. They have it on their screen right now.'}
      </p>

      <div className="mt-8">
        {mode === 'choose' ? (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/setup')}
              className="card card-hover w-full p-5 text-left"
            >
              <div className="text-2xl">🌌</div>
              <div className="mt-3 font-display text-lg font-bold">I&apos;ll create it</div>
              <p className="mt-1 text-sm text-ash">
                Name the couple, set the date, get a code to send them.
              </p>
            </button>

            <button onClick={() => setMode('join')} className="card card-hover w-full p-5 text-left">
              <div className="text-2xl">🔑</div>
              <div className="mt-3 font-display text-lg font-bold">They already made one</div>
              <p className="mt-1 text-sm text-ash">I have a code from my partner.</p>
            </button>
          </div>
        ) : (
          <JoinForm onBack={() => setMode('choose')} />
        )}
      </div>
    </div>
  );
}

function JoinForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const api = useApi();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setError(null);
    setLoading(true);
    try {
      await api.post<Couple>('/couple/join', { invite_code: code });
      await api.patch('/me', { onboarding_done: true });
      router.push('/universe');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'That code did not work. Check it and try again.'
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <Field label="Couple code" hint="Not case sensitive. Expires 48 hours after they made it.">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="XXXXXX"
          className={cn('text-center font-mono text-2xl tracking-[0.5em]')}
          maxLength={6}
          inputMode="text"
          autoCapitalize="characters"
          autoFocus
        />
      </Field>

      <Button onClick={join} loading={loading} disabled={code.length < 6} fullWidth size="lg">
        Claim my seat 💘
      </Button>

      <button onClick={onBack} className="w-full text-center text-sm text-ash hover:text-blush">
        ← Back
      </button>
    </div>
  );
}
