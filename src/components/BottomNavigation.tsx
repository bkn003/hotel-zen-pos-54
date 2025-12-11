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
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 safe-area-inset-bottom">
      {/* Premium glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/85 backdrop-blur-2xl border-t border-border/50" />

      <div className="relative flex justify-around items-center py-2.5 px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to ||
            (to === '/billing' && location.pathname === '/');

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 min-w-[56px] flex-1 mx-1",
                isActive
                  ? "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02] -translate-y-0.5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-white/15" : ""
              )}>
                <Icon className={cn(
                  "transition-all duration-300",
                  isActive ? "w-5 h-5" : "w-5 h-5"
                )} />
              </div>
              <span className={cn(
                "font-medium truncate transition-all duration-300 mt-0.5",
                isActive ? "text-[11px]" : "text-[10px]"
              )}>{label}</span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
