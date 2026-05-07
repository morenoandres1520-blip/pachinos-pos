'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// Middleware handles the redirect, but if it fails (timeout, slow network),
// this client-side fallback kicks in so the user is never stuck.
export default function Home() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      window.location.replace(session ? '/pos' : '/login');
    });
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-amber-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-amber-700" />
        <p className="text-sm text-amber-800">Cargando...</p>
      </div>
    </div>
  );
}
