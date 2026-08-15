// These screens depend on the signed-in session, so there is nothing
// useful to prerender — and prerendering them runs Supabase client
// creation at build time, which needs env vars that only exist at runtime.
export const dynamic = 'force-dynamic';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md px-6 py-12">{children}</div>;
}
