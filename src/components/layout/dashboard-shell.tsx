'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex h-screen flex-col bg-amber-50/30 overflow-hidden">
      <header className="shrink-0 z-40 border-b border-amber-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-amber-900">PaChinos</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-700 truncate max-w-[140px]">
              {profile?.full_name ?? user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={signOut}
              aria-label="Cerrar sesión"
              className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto pb-16">{children}</main>

      <BottomNav />
    </div>
  );
}
