'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LOG_MODES, MOOD_EMOJI, MOOD_LABELS, type MoodPoint, type RealityLog } from '@real/types';
import { moodSyncScore } from '@real/utils';
import { Alert, Badge, Button, Card, EmptyState, Field, Skeleton, Textarea } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';
import { cn } from '@/lib/cn';
import { MoodChart } from '@/components/reality/MoodChart';

interface TodayState {
  mine: RealityLog | null;
  partner: {
    checked_in: boolean;
    mood_score?: number;
    shared_text?: string | null;
    promise_made?: string | null;
  };
}

interface CheckInResponse {
  log: RealityLog;
  sparks: { base: number; shared_bonus: number; promise_bonus: number; streak_bonus: number; total: number };
  streak: { current: number; longest: number; continued: boolean; broken: boolean };
}

/**
 * Reality — the daily check-in.
 * This is the habit the whole product is built around, so it is one screen,
 * one scroll, and never more than about thirty seconds of work.
 */
export default function RealityPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const celebrate = useSparkCelebration();

  const today = useQuery({ queryKey: ['journal', 'today'], queryFn: () => api.get<TodayState>('/journal/today') });
  const mood = useQuery({ queryKey: ['journal', 'mood'], queryFn: () => api.get<MoodPoint[]>('/journal/mood?days=30') });

  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [entry, setEntry] = useState('');
  const [shared, setShared] = useState('');
  const [promise, setPromise] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);

  const checkIn = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<CheckInResponse>('/journal/checkin', payload),
    onSuccess: (data) => {
      setResult(data);
      celebrate(data.sparks.total);
      void queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });

  if (today.isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const alreadyLogged = Boolean(today.data?.mine) || Boolean(result);
  const syncScore = mood.data ? moodSyncScore(mood.data) : null;

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-extrabold">Reality</h1>
        <p className="mt-1 text-sm text-ash">
          {alreadyLogged ? 'Logged. That is today handled.' : 'How was it, honestly?'}
        </p>
      </header>

      {result && (
        <Card glow className="border-gold/40 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 font-display text-xl font-bold text-gold">
            +{result.sparks.total} Sparks
          </p>
          <p className="mt-1 text-sm text-ash">
            {result.streak.continued
              ? `${result.streak.current}-day streak. Do not stop now.`
              : `Streak restarted at ${result.streak.current}. Day one again.`}
          </p>
          {result.sparks.streak_bonus > 0 && (
            <Badge tone="gold">Weekly streak bonus +{result.sparks.streak_bonus}</Badge>
          )}
        </Card>
      )}

      {!alreadyLogged && (
        <Card>
          {checkIn.error && (
            <Alert tone="error">
              {checkIn.error instanceof Error ? checkIn.error.message : 'Could not save that.'}
            </Alert>
          )}

          <p className="label">Today&apos;s mood</p>
          <div className="mt-4 flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setMoodScore(score)}
                aria-label={MOOD_LABELS[score]}
                className={cn(
                  'flex-1 rounded-xl border py-3 text-2xl transition-all active:scale-95',
                  moodScore === score
                    ? 'border-hot-pink bg-hot-pink/15 shadow-glow'
                    : 'border-white/10 bg-slate/40 opacity-60 hover:opacity-100'
                )}
              >
                {MOOD_EMOJI[score]}
              </button>
            ))}
          </div>
          {moodScore && <p className="mt-2 text-center text-xs text-ash">{MOOD_LABELS[moodScore]}</p>}

          <div className="mt-6 space-y-4">
            <Field label="What actually happened" hint="Private unless you share it below.">
              <Textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="The unedited version..."
                maxLength={5000}
              />
            </Field>

            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                isShared ? 'border-purple bg-purple/15' : 'border-white/10 bg-slate/40'
              )}
            >
              <span className="text-lg">{isShared ? '👀' : '🔒'}</span>
              <span className="flex-1">
                {isShared ? 'Sharing something with them' : 'Keeping this to myself'}
              </span>
              <Badge tone={isShared ? 'purple' : 'muted'}>+5 ✨</Badge>
            </button>

            {isShared && (
              <Field label="For their eyes" hint="Only this part reaches them.">
                <Textarea
                  value={shared}
                  onChange={(e) => setShared(e.target.value)}
                  placeholder="The bit they should know..."
                  maxLength={5000}
                />
              </Field>
            )}

            <Field label="One promise for tomorrow" hint="Keep it and earn 15 ✨ tomorrow.">
              <Textarea
                value={promise}
                onChange={(e) => setPromise(e.target.value)}
                placeholder="Small. Specific. Actually doable."
                maxLength={280}
                className="min-h-[70px]"
              />
            </Field>

            <Button
              onClick={() =>
                checkIn.mutate({
                  mood_score: moodScore,
                  entry_text: entry.trim() || undefined,
                  shared_text: isShared && shared.trim() ? shared.trim() : undefined,
                  mode: isShared ? LOG_MODES[1] : LOG_MODES[0],
                  promise_made: promise.trim() || undefined,
                })
              }
              loading={checkIn.isPending}
              disabled={!moodScore}
              fullWidth
              size="lg"
            >
              Lock in today 🔥
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <p className="label">Their day</p>
          {today.data?.partner.checked_in ? (
            <Badge tone="pink">Checked in</Badge>
          ) : (
            <Badge tone="muted">Waiting</Badge>
          )}
        </div>

        {today.data?.partner.checked_in ? (
          <div className="mt-4">
            <p className="text-3xl">{MOOD_EMOJI[today.data.partner.mood_score ?? 3]}</p>
            {today.data.partner.shared_text ? (
              <p className="mt-3 rounded-xl bg-slate/50 p-4 text-sm leading-relaxed">
                {today.data.partner.shared_text}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ash">
                They logged today but kept the details private. That is allowed.
              </p>
            )}
            {today.data.partner.promise_made && (
              <p className="mt-3 text-xs text-ash">
                Their promise: <span className="text-blush">{today.data.partner.promise_made}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ash">Nothing from them yet today.</p>
        )}
      </Card>

      {mood.data && mood.data.length > 1 ? (
        <Card>
          <div className="flex items-center justify-between">
            <p className="label">Mood sync · 30 days</p>
            {syncScore !== null && <Badge tone="purple">{syncScore}% in sync</Badge>}
          </div>
          <MoodChart points={mood.data} className="mt-4" />
        </Card>
      ) : (
        <EmptyState
          emoji="📈"
          title="No pattern yet"
          body="Check in for a few days and the mood chart starts telling you things you had not noticed."
        />
      )}
    </div>
  );
}
