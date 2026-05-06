'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings,
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/inventory', label: 'Inventario', icon: Package },
  { href: '/sales', label: 'Ventas', icon: Receipt },
  { href: '/reports', label: 'Reportes', icon: BarChart3, adminOnly: true },
  { href: '/settings', label: 'Ajustes', icon: Settings, adminOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, loading } = usePermissions();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  if (loading) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
                isActive
                  ? 'text-amber-800 font-semibold'
                  : 'text-stone-500 hover:text-amber-700'
              )}
            >
              <Icon
                className={cn(
                  'size-5',
                  isActive ? 'text-amber-700' : 'text-stone-400'
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-amber-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
