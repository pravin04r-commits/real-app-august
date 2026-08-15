import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="animate-heartbeat text-6xl">💔</div>
      <h1 className="mt-6 font-display text-4xl font-extrabold">Nothing here</h1>
      <p className="mt-3 max-w-sm text-ash">
        This page does not exist. Which is a bit dramatic of it, honestly.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-real-gradient px-7 py-3 font-semibold text-white shadow-glow"
      >
        Take me home
      </Link>
    </main>
  );
}
