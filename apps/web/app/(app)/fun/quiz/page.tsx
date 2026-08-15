'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { LoveLanguage } from '@real/types';
import { Alert, Badge, Button, Card, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useSparkCelebration } from '@/hooks/useSparks';
import { cn } from '@/lib/cn';

interface Question {
  id: string;
  text: string;
  options: Array<{ value: string; label: string }>;
}

interface QuizResponse {
  language: LoveLanguage;
  label: string;
  tally: Record<LoveLanguage, number>;
  partner_language: LoveLanguage | null;
  insight: string | null;
  sparks_earned: number;
}

export default function LoveLanguageQuizPage() {
  const api = useApi();
  const celebrate = useSparkCelebration();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);

  const questions = useQuery({
    queryKey: ['quiz', 'love_language', 'questions'],
    queryFn: () => api.get<{ questions: Question[] }>('/quiz/love_language/questions'),
  });

  const submit = useMutation({
    mutationFn: () => api.post<QuizResponse>('/quiz/love_language', { answers }),
    onSuccess: (data) => celebrate(data.sparks_earned),
  });

  if (questions.isLoading) return <Skeleton className="h-72" />;

  const list = questions.data?.questions ?? [];
  const question = list[index];
  const answered = Object.keys(answers).length;
  const done = answered === list.length && list.length > 0;

  if (submit.data) {
    return <Result result={submit.data} />;
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <Link href="/fun" className="text-xs text-ash hover:text-blush">
          ← Fun
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Love Language Decoder</h1>
        <p className="mt-1 text-sm text-ash">
          Question {Math.min(index + 1, list.length)} of {list.length}
        </p>
      </header>

      <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-real-gradient transition-all duration-300"
          style={{ width: `${(answered / Math.max(list.length, 1)) * 100}%` }}
        />
      </div>

      {question && (
        <Card key={question.id}>
          <p className="font-display text-xl leading-relaxed">{question.text}</p>
          <div className="mt-5 space-y-2">
            {question.options.map((option) => (
              <button
                key={option.value + option.label}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, [question.id]: option.value }));
                  if (index < list.length - 1) setIndex(index + 1);
                }}
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
      )}

      <div className="flex gap-2">
        {index > 0 && (
          <Button variant="ghost" onClick={() => setIndex(index - 1)}>
            ← Back
          </Button>
        )}
        {done && (
          <Button onClick={() => submit.mutate()} loading={submit.isPending} fullWidth size="lg">
            Decode me 🧬
          </Button>
        )}
      </div>

      {submit.error && (
        <Alert tone="error">
          {submit.error instanceof Error ? submit.error.message : 'Could not score that.'}
        </Alert>
      )}
    </div>
  );
}

function Result({ result }: { result: QuizResponse }) {
  return (
    <div className="space-y-4 pb-6">
      <Card glow className="text-center">
        <p className="label">You receive love through</p>
        <p className="mt-3 font-display text-3xl font-extrabold text-gradient">{result.label}</p>
        <Badge tone="gold">+{result.sparks_earned} ✨</Badge>
      </Card>

      <Card>
        <p className="label">The breakdown</p>
        <div className="mt-4 space-y-2">
          {Object.entries(result.tally)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-16 text-xs capitalize text-ash">{key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-real-gradient"
                    style={{ width: `${(count / 6) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-xs text-ash">{count}</span>
              </div>
            ))}
        </div>
      </Card>

      {result.insight ? (
        <Card className="border-purple/30">
          <p className="label">Cross-mapped with your partner</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{result.insight}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm leading-relaxed text-ash">
            {result.partner_language
              ? 'Cross-mapping is unavailable right now. Your result is saved either way.'
              : 'Once your partner takes this too, we cross-map both results and tell you exactly where you keep misreading each other.'}
          </p>
        </Card>
      )}

      <Link href="/fun" className="block">
        <Button variant="ghost" fullWidth>
          Back to Fun
        </Button>
      </Link>
    </div>
  );
}
