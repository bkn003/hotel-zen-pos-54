
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
  // Global cache invalidation listeners
  React.useEffect(() => {
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
