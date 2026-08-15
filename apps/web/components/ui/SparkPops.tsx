'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRealStore } from '@/lib/store';

/**
 * Floating "+N ✨" celebrations.
 * Earning Sparks should feel like a small win, every time.
 */
export function SparkPops() {
  const pops = useRealStore((s) => s.sparkPops);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-1">
      <AnimatePresence>
        {pops.map((pop) => (
          <motion.div
            key={pop.id}
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={{ opacity: 1, y: -10, scale: 1.1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="rounded-full border border-gold/40 bg-midnight/90 px-4 py-1.5 font-display text-lg font-extrabold text-gold shadow-glow-gold"
          >
            +{pop.amount} ✨
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
