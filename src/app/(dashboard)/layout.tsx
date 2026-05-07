import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/components/auth-provider';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>();

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
