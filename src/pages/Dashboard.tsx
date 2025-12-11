import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Receipt, TrendingUp, Package } from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  totalItems: number;
  todayBills: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayExpenses: 0,
    todayProfit: 0,
    totalItems: 0,
    todayBills: 0,
  });
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Real-time subscription for updates
  useEffect(() => {
    const billsChannel = supabase
      .channel('dashboard-bills-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    const expensesChannel = supabase
      .channel('dashboard-expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's sales (exclude deleted bills)
      const { data: billsData } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('date', today)
        .or('is_deleted.is.null,is_deleted.eq.false');

      const todaySales = billsData?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
      const todayBills = billsData?.length || 0;

      // Fetch today's expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', today);

      const todayExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

      // Fetch total items
      const { data: itemsData } = await supabase
        .from('items')
        .select('id')
        .eq('is_active', true);

      const totalItems = itemsData?.length || 0;

      setStats({
        todaySales,
        todayExpenses,
        todayProfit: todaySales - todayExpenses,
        totalItems,
        todayBills,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (profile?.role !== 'admin') {
    return <Navigate to="/billing" replace />;
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.todaySales)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {stats.todayBills} bills processed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-200/50 dark:border-rose-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Expenses</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-rose-600">
              {formatCurrency(stats.todayExpenses)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Operating expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Profit</CardTitle>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.todayProfit >= 0 ? 'bg-blue-500/20' : 'bg-rose-500/20'}`}>
              <TrendingUp className={`h-4 w-4 ${stats.todayProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className={`text-lg sm:text-2xl font-bold ${stats.todayProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {formatCurrency(stats.todayProfit)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Sales minus expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Items</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-primary">
              {stats.totalItems}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Available for billing
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Overview of today's performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Average Bill Value</span>
              <span className="text-sm font-bold">
                {stats.todayBills > 0 ? formatCurrency(stats.todaySales / stats.todayBills) : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Profit Margin</span>
              <span className="text-sm font-bold">
                {stats.todaySales > 0 ? `${((stats.todayProfit / stats.todaySales) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
              <span className="text-sm font-medium">Database</span>
              <span className="text-sm font-bold text-success">Connected</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
              <span className="text-sm font-medium">POS System</span>
              <span className="text-sm font-bold text-success">Online</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;