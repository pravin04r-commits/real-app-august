import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '../AuthForm';
import { Skeleton } from '@/components/ui';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold">
          <span className="text-gradient">Start the universe</span>
        </h1>
        <p className="mt-2 text-sm text-ash">
          One account each. You will pair up in about ninety seconds.
        </p>
      </div>

      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-72" />}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>

      <p className="mt-8 text-center text-sm text-ash">
        Already have one?{' '}
        <Link href="/login" className="font-semibold text-hot-pink hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
