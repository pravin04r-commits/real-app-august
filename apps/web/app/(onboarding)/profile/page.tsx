'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LOVE_LANGUAGES, type LoveLanguage, type User } from '@real/types';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/cn';

const LANGUAGE_COPY: Record<LoveLanguage, { label: string; emoji: string }> = {
  words: { label: 'Words of affirmation', emoji: '💬' },
  acts: { label: 'Acts of service', emoji: '🛠️' },
  gifts: { label: 'Receiving gifts', emoji: '🎁' },
  time: { label: 'Quality time', emoji: '⏳' },
  touch: { label: 'Physical touch', emoji: '🤗' },
};

const TAGS = [
  'The chaotic one',
  'The planner',
  'The soft one',
  'The menace',
  'The romantic',
  'The realist',
  'The overthinker',
  'The chill one',
];

export default function ProfilePage() {
  const router = useRouter();
  const api = useApi();
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<LoveLanguage | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setError(null);
    setLoading(true);
    try {
      await api.patch<User>('/me', {
        display_name: displayName.trim() || undefined,
        love_language: language ?? undefined,
        personality_tag: tag ?? undefined,
      });
      router.push('/pair');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <p className="label">Step 1 of 2</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold">Who are you, then?</h1>
      <p className="mt-2 text-sm text-ash">
        This is what your partner sees. Choose accordingly.
      </p>

      <div className="mt-8 space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Your name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What they actually call you"
            maxLength={40}
          />
        </Field>

        <div>
          <span className="label mb-3 block">How you receive love</span>
          <div className="space-y-2">
            {LOVE_LANGUAGES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLanguage(value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99]',
                  language === value
                    ? 'border-hot-pink bg-hot-pink/12 shadow-glow'
                    : 'border-white/10 bg-slate/40 hover:border-white/25'
                )}
              >
                <span className="text-xl">{LANGUAGE_COPY[value].emoji}</span>
                <span className="text-sm font-medium">{LANGUAGE_COPY[value].label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ash">
            Not sure? Take the quiz later — it overwrites this.
          </p>
        </div>

        <div>
          <span className="label mb-3 block">Pick your character</span>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTag(value === tag ? null : value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                  tag === value
                    ? 'border-gold/50 bg-gold/15 text-gold'
                    : 'border-white/10 bg-white/5 text-ash hover:text-blush'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} loading={loading} fullWidth size="lg">
          Next: find my person →
        </Button>
      </div>
    </div>
  );
}
