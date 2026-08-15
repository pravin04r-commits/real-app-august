import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/nav/BottomNav';
import { TopBar } from '@/components/nav/TopBar';
import { createClient } from '@/lib/supabase/server';
import { SparkPops } from '@/components/ui/SparkPops';

/**
 * The protected shell.
 *
 * Middleware already blocked signed-out visitors. This layer handles the
 * next question: are they actually paired? An unpaired user gets sent
 * through onboarding rather than to an empty dashboard.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.display_name) redirect('/profile');
  if (!profile?.couple_id) redirect('/pair');

  return (
    <div className="relative min-h-dvh">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 pt-5 safe-bottom">{children}</main>
      <BottomNav />
      <SparkPops />
    </div>
  );
}
