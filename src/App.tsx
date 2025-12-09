
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { FullPageLoader } from "@/components/LoadingSkeleton";

// Lazy load pages for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardAnalytics = lazy(() => import("./pages/DashboardAnalytics"));
const Billing = lazy(() => import("./pages/Billing"));
const Items = lazy(() => import("./pages/Items"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Users = lazy(() => import("./pages/Users"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullPageLoader />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
