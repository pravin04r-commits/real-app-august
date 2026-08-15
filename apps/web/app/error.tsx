'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('R.E.A.L. hit an error:', error);
  }, [error]);

  const isConfigError = error.message.includes('Missing environment variable');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl">🫠</div>
      <h1 className="mt-6 font-display text-3xl font-extrabold">
        {isConfigError ? 'Not configured yet' : 'That did not go to plan'}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ash">
        {isConfigError
          ? 'Supabase environment variables are missing. Copy apps/web/.env.example to apps/web/.env.local and fill in your project URL and anon key.'
          : 'Something broke on our side. Try again — and if it keeps happening, it is our fault, not yours.'}
      </p>
      {isConfigError && (
        <code className="mt-4 max-w-md rounded-lg bg-slate/60 px-4 py-3 text-left font-mono text-xs text-ash">
          {error.message}
        </code>
      )}
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-real-gradient px-7 py-3 font-semibold text-white shadow-glow"
      >
        Try again
      </button>
    </main>
  );
}
