'use client';

import { useAuthContext } from '@/components/auth-provider';

export function useAuth() {
  const { user, profile, signOut } = useAuthContext();
  return { user, profile, loading: false, signOut };
}
