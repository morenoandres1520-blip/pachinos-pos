'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    // getUser() verifies the session server-side via HTTP-only cookies.
    // getSession() only reads localStorage and returns null in SSR cookie-based auth.
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setState({ user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    // Handles subsequent changes: sign-in, sign-out, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setState({ user: session.user, profile, loading: false });
        } else {
          setState({ user: null, profile: null, loading: false });
        }
      }
    );

    // Last resort: if both fail (network timeout), stop spinner after 8s
    const timeout = setTimeout(() => {
      setState((prev) =>
        prev.loading ? { user: null, profile: null, loading: false } : prev
      );
    }, 8000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
