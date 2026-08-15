'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { formatSparks } from '@real/utils';

export function TopBar() {
  const couple = useRealStore((s) => s.couple);
  const me = useRealStore((s) => s.me);
  const reset = useRealStore((s) => s.reset);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-midnight/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/universe" className="flex items-center gap-2">
          <span className="animate-heartbeat text-lg">{couple?.aesthetic?.emoji ?? '🔴'}</span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            {couple?.ship_name ?? 'R.E.A.L.'}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-xs text-gold">
            {formatSparks(me?.spark_balance ?? 0)} ✨
          </span>
          <button
            onClick={signOut}
            className="text-xs text-ash transition-colors hover:text-hot-pink"
            aria-label="Sign out"
          >
            Exit
          </button>
        </div>
      </div>
    </header>
  );
}
