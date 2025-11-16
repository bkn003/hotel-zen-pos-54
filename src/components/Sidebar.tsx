
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
  TrendingUp,
  Users,
  Settings
} from 'lucide-react';

const adminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
  { to: '/items', icon: Package, label: 'Items' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const userNavItems = [
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
];

export const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const navItems = profile.role === 'admin' ? adminNavItems : userNavItems;

  return (
    <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-xl font-bold text-sidebar-foreground">
          {profile.hotel_name || 'Hotel ZEN'}
        </h2>
        <p className="text-sm text-sidebar-accent-foreground">POS Management</p>
      </div>
      
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || 
                            (to === '/billing' && location.pathname === '/');
            
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
