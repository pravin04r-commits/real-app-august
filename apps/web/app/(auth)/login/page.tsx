import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '../AuthForm';
import { Skeleton } from '@/components/ui';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold">
          <span className="text-gradient">Welcome back</span>
        </h1>
        <p className="mt-2 text-sm text-ash">They have been checking if you logged in. Probably.</p>
      </div>

      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-72" />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>

      <p className="mt-8 text-center text-sm text-ash">
        No universe yet?{' '}
        <Link href="/signup" className="font-semibold text-hot-pink hover:underline">
          Start one
        </Link>
      </p>
    </main>
  );
}
