'use client';

import { useAuth } from './use-auth';
import type { UserRole } from '@/types/database';

interface Permissions {
  canManageInventory: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canConfigureBusiness: boolean;
  canVoidSales: boolean;
  canApplyDiscounts: boolean;
  canMakeSales: boolean;
  canViewAllSales: boolean;
  canViewOwnSales: boolean;
  canExportData: boolean;
  isAdmin: boolean;
  isCajera: boolean;
  role: UserRole | null;
  loading: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Omit<Permissions, 'role' | 'loading'>> = {
  admin: {
    canManageInventory: true,
    canManageUsers: true,
    canViewReports: true,
    canConfigureBusiness: true,
    canVoidSales: true,
    canApplyDiscounts: true,
    canMakeSales: true,
    canViewAllSales: true,
    canViewOwnSales: true,
    canExportData: true,
    isAdmin: true,
    isCajera: false,
  },
  cajera: {
    canManageInventory: false,
    canManageUsers: false,
    canViewReports: false,
    canConfigureBusiness: false,
    canVoidSales: false,
    canApplyDiscounts: false,
    canMakeSales: true,
    canViewAllSales: false,
    canViewOwnSales: true,
    canExportData: false,
    isAdmin: false,
    isCajera: true,
  },
};

export function usePermissions(): Permissions {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return {
      canManageInventory: false,
      canManageUsers: false,
      canViewReports: false,
      canConfigureBusiness: false,
      canVoidSales: false,
      canApplyDiscounts: false,
      canMakeSales: false,
      canViewAllSales: false,
      canViewOwnSales: false,
      canExportData: false,
      isAdmin: false,
      isCajera: false,
      role: null,
      loading,
    };
  }

  return {
    ...ROLE_PERMISSIONS[profile.role],
    role: profile.role,
    loading: false,
  };
}
