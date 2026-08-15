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

const SUGGESTED_TAGS = [
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
  // Nobody has exactly one love language. Pick as many as are true.
  const [languages, setLanguages] = useState<LoveLanguage[]>([]);
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleLanguage(value: LoveLanguage) {
    setLanguages((prev) =>
      prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]
    );
  }

  async function save() {
    setError(null);
    setLoading(true);
    try {
      await api.patch<User>('/me', {
        display_name: displayName.trim() || undefined,
        love_languages: languages.length > 0 ? languages : undefined,
        personality_tag: tag.trim() || undefined,
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
      <p className="mt-2 text-sm text-ash">This is what your partner sees. Choose accordingly.</p>

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
          <div className="mb-3 flex items-baseline justify-between">
            <span className="label">How you receive love</span>
            <span className="text-[11px] text-ash">
              {languages.length > 0 ? `${languages.length} selected` : 'pick any'}
            </span>
          </div>

          <div className="space-y-2">
            {LOVE_LANGUAGES.map((value) => {
              const selected = languages.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleLanguage(value)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99]',
                    selected
                      ? 'border-hot-pink bg-hot-pink/12 shadow-glow'
                      : 'border-white/10 bg-slate/40 hover:border-white/25'
                  )}
                >
                  <span className="text-xl">{LANGUAGE_COPY[value].emoji}</span>
                  <span className="flex-1 text-sm font-medium">{LANGUAGE_COPY[value].label}</span>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md border text-[11px] transition-colors',
                      selected ? 'border-hot-pink bg-hot-pink text-white' : 'border-white/20 text-transparent'
                    )}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-ash">
            Pick as many as are true — most people have more than one. Not sure? Take the quiz
            later, it overwrites this.
          </p>
        </div>

        <div>
          <span className="label mb-3 block">Pick your character</span>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTag(value === tag ? '' : value)}
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

          <div className="mt-3">
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="…or write your own"
              maxLength={40}
              aria-label="Your character"
            />
            <p className="mt-1.5 text-xs text-ash">
              Tap a suggestion to fill this in, or type whatever is actually true.
            </p>
          </div>
        </div>

        <Button onClick={save} loading={loading} fullWidth size="lg">
          Next: find my person →
        </Button>
      </div>
    </div>
  );
}
