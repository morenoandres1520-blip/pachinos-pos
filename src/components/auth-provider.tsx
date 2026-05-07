'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: React.ReactNode;
}

export function AuthProvider({
  initialUser,
  initialProfile,
  children,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: initialUser,
    profile: initialProfile,
  });
  const router = useRouter();
  const initialUserId = useRef(initialUser?.id ?? null);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ user: null, profile: null });
        window.location.href = '/login';
        return;
      }

      if (event === 'SIGNED_IN') {
        // Re-fetch from server (layout) when a different user signs in
        if (session?.user?.id !== initialUserId.current) {
          router.refresh();
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setState((prev) => ({ ...prev, user: session.user }));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
