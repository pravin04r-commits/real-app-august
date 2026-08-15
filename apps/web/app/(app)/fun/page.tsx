'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { DateSpinner } from '@/components/fun/DateSpinner';

const TOOLS = [
  {
    href: '/fun/quiz',
    emoji: '🧬',
    title: 'Love Language Decoder',
    body: 'Six questions. Then we cross-map both of you and tell you where you keep misreading each other.',
  },
  {
    href: '/fun/compatibility',
    emoji: '💥',
    title: 'Compatibility Score',
    body: 'Dramatic, over-the-top, scientifically meaningless. Both of you have to answer.',
  },
  {
    href: '/fun/memories',
    emoji: '🫙',
    title: 'Memory Jar',
    body: 'Add one a week. Watch it fill. Read it back on a bad day.',
  },
  {
    href: '/fun/timeline',
    emoji: '🗺️',
    title: 'Milestone Wall',
    body: 'Everything that happened, in order, with the receipts.',
  },
  {
    href: '/fun/missions',
    emoji: '🎯',
    title: 'Missions',
    body: 'The trip, the ring, the deposit. Money goals you are both actually watching.',
  },
  {
    href: '/fun/report-card',
    emoji: '📊',
    title: 'Monthly Report Card',
    body: 'Your month, graded. Generous marking. Mostly.',
  },
];

export default function FunPage() {
  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-extrabold">Fun</h1>
        <p className="mt-1 text-sm text-ash">
          The unserious half. Which is doing more work than it looks like.
        </p>
      </header>

      <DateSpinner />

      <div className="space-y-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="block">
            <Card className="card-hover flex items-start gap-4">
              <span className="text-2xl">{tool.emoji}</span>
              <div className="flex-1">
                <p className="font-display text-base font-bold">{tool.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ash">{tool.body}</p>
              </div>
              <span className="text-ash">→</span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-purple/25 bg-purple/5">
        <p className="label">Going public</p>
        <p className="mt-2 text-sm leading-relaxed text-ash">
          Want a shareable card with your streak and story? Turn it on in{' '}
          <Link href="/fun/public" className="text-hot-pink hover:underline">
            public profile settings
          </Link>
          . Nothing private ever leaves — only streaks, Sparks and names.
        </p>
      </Card>
    </div>
  );
}
