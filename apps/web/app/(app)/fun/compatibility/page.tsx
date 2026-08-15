'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Badge, Button, Card, ProgressBar, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';
import { cn } from '@/lib/cn';

interface Question {
  id: string;
  text: string;
  options: Array<{ value: string; label: string }>;
}

interface CompatResponse {
  waiting_for_partner: boolean;
  score?: number;
  headline?: string;
  breakdown?: Array<{ label: string; score: number; note: string }>;
  verdict?: string;
  sparks_earned: number;
  message?: string;
}

export default function CompatibilityPage() {
  const api = useApi();
  const celebrate = useSparkCelebration();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = useQuery({
    queryKey: ['quiz', 'compatibility', 'questions'],
    queryFn: () => api.get<{ questions: Question[] }>('/quiz/compatibility/questions'),
  });

  const submit = useMutation({
    mutationFn: () => api.post<CompatResponse>('/quiz/compatibility', { answers }),
    onSuccess: (data) => celebrate(data.sparks_earned),
  });

  if (questions.isLoading) return <Skeleton className="h-72" />;

  const list = questions.data?.questions ?? [];
  const complete = Object.keys(answers).length === list.length && list.length > 0;

  if (submit.data) return <CompatResult result={submit.data} />;

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Compatibility Score</h1>
        <p className="mt-1 text-sm text-ash">
          Both of you answer separately. No peeking. It only scores once you both submit.
        </p>
      </header>

      {list.map((question) => (
        <Card key={question.id}>
          <p className="font-display text-lg leading-relaxed">{question.text}</p>
          <div className="mt-4 space-y-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-left text-sm transition-all active:scale-[0.99]',
                  answers[question.id] === option.value
                    ? 'border-hot-pink bg-hot-pink/12'
                    : 'border-white/10 bg-slate/40 hover:border-white/25'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>
      ))}

      {submit.error && (
        <Alert tone="error">
          {submit.error instanceof Error ? submit.error.message : 'Could not score that.'}
        </Alert>
      )}

      <Button
        onClick={() => submit.mutate()}
        loading={submit.isPending}
        disabled={!complete}
        fullWidth
        size="lg"
      >
        Judge us 💥
      </Button>
    </div>
  );
}

function CompatResult({ result }: { result: CompatResponse }) {
  if (result.waiting_for_partner) {
    return (
      <div className="space-y-4 pb-6 pt-8 text-center">
        <div className="animate-float text-5xl">⏳</div>
        <h1 className="font-display text-2xl font-extrabold">Locked in</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-ash">
          {result.message ?? 'Nothing happens until they take it too. Go and nag them.'}
        </p>
        <Badge tone="gold">+{result.sparks_earned} ✨</Badge>
        <Link href="/fun" className="block pt-4">
          <Button variant="ghost" fullWidth>
            Back to Fun
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <Card glow className="text-center">
        <p className="label">The verdict</p>
        <p className="mt-3 font-display text-6xl font-extrabold text-gradient">{result.score}</p>
        <p className="mt-2 font-display text-xl font-bold">{result.headline}</p>
      </Card>

      {result.verdict && (
        <Card className="border-purple/30">
          <p className="whitespace-pre-line text-sm italic leading-relaxed">{result.verdict}</p>
        </Card>
      )}

      <Card>
        <p className="label">Where it came from</p>
        <div className="mt-4 space-y-4">
          {(result.breakdown ?? []).map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-mono text-xs text-ash">{item.score}</span>
              </div>
              <ProgressBar value={item.score} className="mt-2" />
              <p className="mt-1 text-xs text-ash">{item.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="px-4 text-center text-xs leading-relaxed text-ash">
        This is entertainment. It measures how you answered six questions on a Tuesday, not
        your relationship.
      </p>

      <Link href="/fun" className="block">
        <Button variant="ghost" fullWidth>
          Back to Fun
        </Button>
      </Link>
    </div>
  );
}
