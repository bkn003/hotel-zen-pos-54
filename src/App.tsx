
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";

// Direct imports for faster navigation (no lazy loading overhead)
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import Billing from "./pages/Billing";
import Items from "./pages/Items";
import Expenses from "./pages/Expenses";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - longer cache
      gcTime: 1000 * 60 * 30, // 30 minutes cache retention
      retry: 1, // Fewer retries for faster perceived failure
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on every mount
    },
  },
});

import { InstallPrompt } from './components/InstallPrompt';

const App = () => {
  // Theme colors for status bar (meta theme-color)
  const themeColors: Record<string, string> = {
    'blue': '#3b82f6',
    'purple': '#9333ea',
    'green': '#10b981',
    'rose': '#e11d48',
    'sunset': '#f97316',
    'navy': '#1e3a8a',
    'hotpink': '#c11c84'
  };

  // Global cache invalidation listeners and theme initialization
  React.useEffect(() => {
    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('hotel_pos_theme') || 'blue';

    // Apply theme class
    if (savedTheme && savedTheme !== 'blue') {
      const themeClass = `theme-${savedTheme}`;
      document.documentElement.classList.add(themeClass);
    }

    // Apply theme-color meta tag for status bar
    const themeColor = themeColors[savedTheme] || '#3b82f6';
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    } else {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      metaThemeColor.setAttribute('content', themeColor);
      document.head.appendChild(metaThemeColor);
    }

    const handleInvalidateBills = () => {
      console.log('Global: Invalidating bills cache');
      import('@/utils/cacheUtils').then(({ invalidateRelatedData }) => {
        invalidateRelatedData('bills');
      });
    };

    const handleInvalidateItems = () => {
      console.log('Global: Invalidating items cache');
      import('@/utils/cacheUtils').then(({ invalidateRelatedData }) => {
        invalidateRelatedData('items');
      });
    };

    const handleInvalidatePayments = () => {
      console.log('Global: Invalidating payments cache');
      import('@/utils/cacheUtils').then(({ invalidateRelatedData }) => {
        invalidateRelatedData('payments');
      });
    };

    const handleInvalidateExpenses = () => {
      console.log('Global: Invalidating expenses cache');
      import('@/utils/cacheUtils').then(({ invalidateRelatedData }) => {
        invalidateRelatedData('expenses');
      });
    };

    window.addEventListener('bills-updated', handleInvalidateBills);
    window.addEventListener('items-updated', handleInvalidateItems);
    window.addEventListener('payment-types-updated', handleInvalidatePayments);
    window.addEventListener('expenses-updated', handleInvalidateExpenses);

    return () => {
      window.removeEventListener('bills-updated', handleInvalidateBills);
      window.removeEventListener('items-updated', handleInvalidateItems);
      window.removeEventListener('payment-types-updated', handleInvalidatePayments);
      window.removeEventListener('expenses-updated', handleInvalidateExpenses);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout><Billing /></Layout>} />
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/analytics" element={<Layout><DashboardAnalytics /></Layout>} />
              <Route path="/billing" element={<Layout><Billing /></Layout>} />
              <Route path="/items" element={<Layout><Items /></Layout>} />
              <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
              <Route path="/reports" element={<Layout><Reports /></Layout>} />
              <Route path="/users" element={<Layout><Users /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
