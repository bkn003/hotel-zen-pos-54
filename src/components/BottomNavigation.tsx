import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  BarChart3, 
  Users 
} from 'lucide-react';

const adminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
  { to: '/items', icon: Package, label: 'Items' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/users', icon: Users, label: 'Users' },
];

const userNavItems = [
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
];

export const BottomNavigation: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const navItems = profile.role === 'admin' ? adminNavItems : userNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden">
      <div className="flex justify-around p-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || 
                          (to === '/billing' && location.pathname === '/');
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all duration-200 min-w-0 flex-1",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};