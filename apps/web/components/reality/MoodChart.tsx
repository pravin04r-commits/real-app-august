'use client';

import type { MoodPoint } from '@real/types';
import { cn } from '@/lib/cn';

/**
 * Two-line mood chart, hand-drawn as SVG.
 * No chart library for six data points — it would cost more than it gives.
 */
export function MoodChart({ points, className }: { points: MoodPoint[]; className?: string }) {
  const width = 320;
  const height = 120;
  const padding = 8;

  const usable = points.slice(-30);
  if (usable.length < 2) return null;

  const stepX = (width - padding * 2) / (usable.length - 1);
  const scaleY = (score: number) => {
    // Mood runs 1–5; invert so 5 sits at the top.
    const ratio = (score - 1) / 4;
    return height - padding - ratio * (height - padding * 2);
  };

  const buildPath = (key: 'mine' | 'partner') => {
    let path = '';
    let started = false;
    usable.forEach((point, index) => {
      const value = point[key];
      if (value === null || value === undefined) return;
      const x = padding + index * stepX;
      const y = scaleY(value);
      path += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
      started = true;
    });
    return path;
  };

  const minePath = buildPath('mine');
  const partnerPath = buildPath('partner');

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mood over the last 30 days for both partners"
      >
        {[1, 3, 5].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={scaleY(line)}
            y2={scaleY(line)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}

        {partnerPath && (
          <path
            d={partnerPath}
            fill="none"
            stroke="#7B2FBE"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {minePath && (
          <path
            d={minePath}
            fill="none"
            stroke="#FF2D6B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div className="mt-3 flex justify-center gap-5 text-xs text-ash">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-hot-pink" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple" /> Them
        </span>
      </div>
    </div>
  );
}
