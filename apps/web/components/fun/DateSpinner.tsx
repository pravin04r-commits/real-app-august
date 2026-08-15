'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button, Card } from '@/components/ui';

/**
 * Date Night Spinner — zero backend, instant payoff.
 * Sometimes the whole problem is that neither of you will decide.
 */
const IDEAS = [
  'Cook something neither of you has made before. No recipe after step three.',
  'Go to the cinema and pick the film with the worst poster.',
  'Walk a route you have never walked. Turn left every time you are unsure.',
  'Order the thing you always say you will try and never do.',
  'Recreate your first date, badly, on a budget.',
  'Living room picnic. Floor only. Fairy lights mandatory.',
  'Each of you plans two hours in secret. Swap halfway.',
  'Drive until the songs run out, then turn around.',
  'Museum, gallery, or the weirdest local shop you can find.',
  'Board game, high stakes. Loser owes a favour.',
  'Sunrise. Yes, actually. Set the alarm.',
  'Cook for someone else together. Deliver it. Feel smug.',
  'Play tourist in your own city. Take the terrible photos.',
  'No-phone dinner somewhere neither of you has been.',
  'Build something from a flat pack. Test the relationship.',
];

export function DateSpinner() {
  const [idea, setIdea] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  function spin() {
    setSpinning(true);
    let ticks = 0;
    const timer = setInterval(() => {
      setIdea(IDEAS[Math.floor(Math.random() * IDEAS.length)] ?? null);
      ticks += 1;
      if (ticks > 9) {
        clearInterval(timer);
        setSpinning(false);
      }
    }, 70);
  }

  return (
    <Card glow className="text-center">
      <p className="label">Date night spinner</p>

      <motion.div
        key={idea}
        initial={{ opacity: 0.4, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 min-h-[72px] font-display text-lg leading-relaxed"
      >
        {idea ?? 'Neither of you is going to decide, are you.'}
      </motion.div>

      <Button onClick={spin} loading={spinning} fullWidth className="mt-4">
        {idea ? 'Again 🎲' : 'Decide for us 🎲'}
      </Button>
    </Card>
  );
}
