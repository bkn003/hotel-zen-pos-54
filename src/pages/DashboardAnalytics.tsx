import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Package } from 'lucide-react';

interface SalesData {
  date: string;
  sales: number;
  expenses: number;
  profit: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
  unit: string;
}

type Period = 'today' | 'yesterday' | 'daily' | 'weekly' | 'monthly';

const DashboardAnalytics = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalBills: 0,
  });



  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  // Real-time subscription for updates
  useEffect(() => {
    const billsChannel = supabase
      .channel('analytics-bills-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
        fetchAnalyticsData();
      })
      .subscribe();

    const expensesChannel = supabase
      .channel('analytics-expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchAnalyticsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      let startDate: Date;
      let endDate: Date = new Date(today);

      switch (period) {
        case 'today':
          startDate = new Date(today);
          break;
        case 'yesterday':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 1);
          endDate = new Date(startDate);
          break;
        case 'daily':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 6);
          break;
        case 'weekly':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 27);
          break;
        case 'monthly':
        default:
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 6);
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch bills (exclude deleted)
      const { data: billsData } = await supabase
        .from('bills')
        .select('total_amount, date, discount')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('date');

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, date')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date');

      // Fetch top selling items (using bill date filter to match the bills query)
      const { data: billItemsData } = await supabase
        .from('bill_items')
        .select(`
          quantity, 
          price, 
          total,
          item_id, 
          items(name, unit),
          bills!inner(date, is_deleted)
        `)
        .gte('bills.date', startDateStr)
        .lte('bills.date', endDateStr);

      // Process sales data
      const salesMap = new Map<string, { sales: number; expenses: number }>();

      billsData?.forEach(bill => {
        const date = bill.date;
        const current = salesMap.get(date) || { sales: 0, expenses: 0 };
        salesMap.set(date, { ...current, sales: current.sales + Number(bill.total_amount) });
      });

      expensesData?.forEach(expense => {
        const date = expense.date;
        const current = salesMap.get(date) || { sales: 0, expenses: 0 };
        salesMap.set(date, { ...current, expenses: current.expenses + Number(expense.amount) });
      });

      const chartData: SalesData[] = Array.from(salesMap.entries())
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: data.sales,
          expenses: data.expenses,
          profit: data.sales - data.expenses,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setSalesData(chartData);

      // Process top items (exclude items from deleted bills)
      const itemsMap = new Map<string, { quantity: number; revenue: number; unit: string }>();

      billItemsData?.forEach((item: any) => {
        // Skip items from deleted bills
        if (item.bills?.is_deleted) return;

        const name = item.items?.name || 'Unknown';
        const unit = item.items?.unit || 'pcs';
        const current = itemsMap.get(name) || { quantity: 0, revenue: 0, unit };
        // Use the pre-calculated 'total' field which correctly accounts for base_value
        // This fixes the issue where quantity * price gave wrong results for weight-based items
        itemsMap.set(name, {
          quantity: current.quantity + Number(item.quantity),
          revenue: current.revenue + Number(item.total),
          unit: unit,
        });
      });

      const topItemsData = Array.from(itemsMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopItems(topItemsData);

      // Calculate stats (from non-deleted bills only)
      const totalRevenue = billsData?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      setStats({
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        totalBills: billsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (profile?.role !== 'admin') {
    return <Navigate to="/billing" replace />;
  }

  if (loading) {
    return (
      <div className="p-4 space-y-6">
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
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your business performance and insights</p>
        </div>
      </div>

      {/* Summary Cards - Premium Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg dark:shadow-none border border-border">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-500 mb-1">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">For selected period</p>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg dark:shadow-none border border-border">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Expenses</p>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-500 mb-1">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-xs text-muted-foreground">For selected period</p>
        </div>

        {/* Net Profit Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg dark:shadow-none border border-border">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Net Profit</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.totalProfit >= 0 ? 'bg-blue-500/10 dark:bg-blue-500/20' : 'bg-rose-500/10 dark:bg-rose-500/20'}`}>
              <ShoppingBag className={`w-4 h-4 ${stats.totalProfit >= 0 ? 'text-blue-500' : 'text-rose-500'}`} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold mb-1 ${stats.totalProfit >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{formatCurrency(stats.totalProfit)}</p>
          <p className="text-xs text-muted-foreground">{stats.totalRevenue > 0 ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}% margin` : '0% margin'}</p>
        </div>

        {/* Total Bills Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg dark:shadow-none border border-border">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Bills</p>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-500" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground mb-1">{stats.totalBills}</p>
          <p className="text-xs text-muted-foreground">Avg: {stats.totalBills > 0 ? formatCurrency(stats.totalRevenue / stats.totalBills) : '₹0'}</p>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="flex w-full flex-wrap gap-1 sm:gap-2 justify-between sm:justify-start">
          <TabsTrigger value="today" className="flex-1 min-w-[80px] text-xs sm:text-sm sm:flex-none">Today</TabsTrigger>
          <TabsTrigger value="yesterday" className="flex-1 min-w-[80px] text-xs sm:text-sm sm:flex-none">Yesterday</TabsTrigger>
          <TabsTrigger value="daily" className="flex-1 min-w-[80px] text-xs sm:text-sm sm:flex-none">7 Days</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 min-w-[80px] text-xs sm:text-sm sm:flex-none">4 Weeks</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1 min-w-[80px] text-xs sm:text-sm sm:flex-none">6 Months</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4 space-y-6">
          {/* Sales & Expenses Trend */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Sales & Expenses Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track your revenue, expenses, and profit over time</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--success))" name="Sales" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" name="Expenses" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Selling Items - Modern List View */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Top Selling Items
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              {topItems.length > 0 ? (
                <div className="space-y-3">
                  {topItems.map((item, index) => {
                    const maxRevenue = topItems[0]?.revenue || 1;
                    const percentage = (item.revenue / maxRevenue) * 100;

                    return (
                      <div
                        key={item.name}
                        className="relative bg-gradient-to-r from-muted/50 to-muted/20 rounded-xl p-3 sm:p-4 hover:from-primary/10 hover:to-primary/5 transition-all duration-300 border border-border/50"
                      >
                        {/* Rank Badge */}
                        <div className="absolute -left-1 -top-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                          {index + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ml-4">
                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <ShoppingBag className="w-3 h-3" />
                                <span className="font-medium text-foreground">{item.quantity}</span> {item.unit || 'pcs'} sold
                              </span>
                            </div>
                          </div>

                          {/* Revenue */}
                          <div className="flex items-center gap-2 sm:gap-4">
                            <span className="text-lg sm:text-xl font-bold text-primary">
                              {formatCurrency(item.revenue)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 ml-4 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No sales data available</p>
                  <p className="text-xs text-muted-foreground mt-1">Sales will appear here once bills are created</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAnalytics;