import Link from 'next/link';
import { isConfigured } from '@/lib/env';
import { SetupNotice } from '@/components/SetupNotice';

const FEATURES = [
  { emoji: '💑', title: 'Two people. That is the whole list.', body: 'One couple code. Once your partner claims it, the door closes. No third wheel, ever.' },
  { emoji: '✨', title: 'Sparks', body: 'Earn them by showing up. Spend them on the good stuff — date night dictatorship, chore immunity, aux cord rights.' },
  { emoji: '🎯', title: 'Weekly dares', body: 'AI-written, tuned to your actual relationship. Same city or six timezones apart.' },
  { emoji: '🔥', title: 'Streaks that mean something', body: 'Check in daily. Watch the number climb. Feel deeply unwilling to break it.' },
  { emoji: '🗺️', title: 'Your own roadmap', body: 'Milestones, missions, the trip you keep talking about. Tracked, celebrated, rewarded.' },
  { emoji: '🌍', title: 'Go public, if you want', body: 'A shareable card with your streak and your story. Opt-in. Nothing private ever leaves.' },
];

export default function LandingPage() {
  if (!isConfigured) return <SetupNotice />;

  return (
    <main className="mx-auto max-w-lg px-5 pb-20">
      <section className="pt-16 text-center">
        <p className="label">N.A.I.R. Solutions presents</p>
        <h1 className="mt-4 font-display text-6xl font-extrabold leading-[0.95] tracking-tight">
          <span className="text-gradient">R.E.A.L.</span>
        </h1>
        <p className="mt-3 font-display text-sm italic text-ash">
          Relationships · Ex&apos;s · Artificial · Language
        </p>

        <p className="mx-auto mt-8 max-w-sm text-[17px] leading-relaxed text-blush/90">
          Your relationship, but it has a scoreboard, a streak, a roadmap and
          an AI that is a little too invested.
        </p>

        <div className="mt-9 flex flex-col gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-real-gradient px-8 py-4 font-semibold text-white shadow-glow transition-all active:scale-[0.97]"
          >
            Start our universe 🔥
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/12 bg-white/5 px-8 py-4 font-semibold text-blush transition-colors hover:bg-white/10"
          >
            We already have one
          </Link>
        </div>

        <p className="mt-5 text-xs text-ash">
          Built for exactly two people. That is not a limitation, it is the point.
        </p>
      </section>

      <section className="mt-20 space-y-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="card card-hover p-5">
            <div className="text-2xl">{feature.emoji}</div>
            <h2 className="mt-3 font-display text-lg font-bold">{feature.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ash">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-hot-pink/25 bg-hot-pink/5 p-6 text-center">
        <p className="label">The golden rule</p>
        <p className="mt-3 font-display text-lg italic leading-relaxed text-blush">
          &ldquo;Every feature must make the couple feel more seen, connected and
          celebrated. If it does none of those three, it does not ship.&rdquo;
        </p>
      </section>

      <section className="mt-12 flex justify-center gap-6 text-xs text-ash">
        <Link href="/leaderboard" className="transition-colors hover:text-hot-pink">
          Leaderboard
        </Link>
        <a
          href="https://nairsolutions.org"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-hot-pink"
        >
          N.A.I.R. Solutions
        </a>
      </section>

      <footer className="mt-10 text-center text-[10px] uppercase tracking-[0.3em] text-ash/50">
        R.E.A.L. · Bhilai, Chhattisgarh · v1.0
      </footer>
    </main>
  );
}
