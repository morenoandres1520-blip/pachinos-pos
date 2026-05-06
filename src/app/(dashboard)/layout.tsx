'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-700" />
          <p className="text-sm text-amber-800">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-amber-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-amber-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-amber-900">PaChinos</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-700 truncate max-w-[140px]">
              {profile?.full_name ?? user.email}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
              className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
