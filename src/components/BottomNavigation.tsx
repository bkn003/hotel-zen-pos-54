import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  TrendingUp,
  Settings
} from 'lucide-react';

const allNavItems = [
  { to: '/analytics', icon: TrendingUp, label: 'Analytics', page: 'analytics' as const },
  { to: '/billing', icon: ShoppingCart, label: 'Billing', page: 'billing' as const },
  { to: '/items', icon: Package, label: 'Items', page: 'items' as const },
  { to: '/expenses', icon: Receipt, label: 'Expenses', page: 'expenses' as const },
  { to: '/reports', icon: BarChart3, label: 'Reports', page: 'reports' as const },
  { to: '/settings', icon: Settings, label: 'Settings', page: 'settings' as const },
];

export const BottomNavigation: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const { hasAccess, loading } = useUserPermissions();

  if (!profile || loading) return null;

  // Filter nav items based on permissions
  const navItems = allNavItems.filter(item => hasAccess(item.page));

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50">
      {/* Premium clean background with subtle shadow - dark mode aware */}
      <div className="absolute inset-0 bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t border-border" />

      <div
        className="relative flex justify-around items-center py-2 px-1"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
      >
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to ||
            (to === '/billing' && location.pathname === '/');

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center py-1 px-1 min-w-[52px] flex-1"
            >
              {/* Icon container - rounded square for active, plain for inactive */}
              <div className={cn(
                "flex items-center justify-center transition-all duration-300",
                isActive
                  ? "w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/90 shadow-lg shadow-primary/30"
                  : "w-8 h-8"
              )}>
                <Icon className={cn(
                  "transition-all duration-300",
                  isActive ? "w-5 h-5 text-white" : "w-5 h-5 text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-[10px] mt-1 transition-all duration-300 font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
