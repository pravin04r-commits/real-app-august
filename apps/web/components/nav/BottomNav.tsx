'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/universe', label: 'Universe', emoji: '🌌' },
  { href: '/reality', label: 'Reality', emoji: '📓' },
  { href: '/dares', label: 'Dares', emoji: '🎯' },
  { href: '/sparks', label: 'Sparks', emoji: '✨' },
  { href: '/fun', label: 'Fun', emoji: '🎮' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-midnight/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide transition-colors',
                  active ? 'text-hot-pink' : 'text-ash hover:text-blush'
                )}
              >
                <span className={cn('text-xl transition-transform', active && 'scale-110')}>
                  {tab.emoji}
                </span>
                {tab.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-real-gradient"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
