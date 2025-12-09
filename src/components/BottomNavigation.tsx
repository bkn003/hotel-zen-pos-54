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
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/90 to-background/80 backdrop-blur-xl border-t border-primary/10" />

      <div className="relative flex justify-around items-center py-2 px-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to ||
            (to === '/billing' && location.pathname === '/');

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-300 min-w-0 flex-1 mx-0.5",
                isActive
                  ? "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105 -translate-y-1"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive ? "bg-white/20" : ""
              )}>
                <Icon className={cn(
                  "transition-all duration-300",
                  isActive ? "w-5 h-5" : "w-4 h-4"
                )} />
              </div>
              <span className={cn(
                "font-medium truncate transition-all duration-300",
                isActive ? "text-[11px] mt-0.5" : "text-[10px] mt-0.5"
              )}>{label}</span>

              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary-foreground animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
