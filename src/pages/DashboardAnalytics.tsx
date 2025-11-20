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

  if (profile?.role !== 'admin') {
    return <Navigate to="/billing" replace />;
  }

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

      // Fetch top selling items (exclude items from deleted bills)
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: billItemsData } = await supabase
        .from('bill_items')
        .select(`
          quantity, 
          price, 
          item_id, 
          items(name),
          bills!inner(is_deleted)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfDay.toISOString());

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
      const itemsMap = new Map<string, { quantity: number; revenue: number }>();
      
      billItemsData?.forEach((item: any) => {
        // Skip items from deleted bills
        if (item.bills?.is_deleted) return;
        
        const name = item.items?.name || 'Unknown';
        const current = itemsMap.get(name) || { quantity: 0, revenue: 0 };
        itemsMap.set(name, {
          quantity: current.quantity + Number(item.quantity),
          revenue: current.revenue + (Number(item.quantity) * Number(item.price)),
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalRevenue > 0 ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}% margin` : '0% margin'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {stats.totalBills > 0 ? formatCurrency(stats.totalRevenue / stats.totalBills) : '₹0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          <TabsTrigger value="daily">Last 7 Days</TabsTrigger>
          <TabsTrigger value="weekly">Last 4 Weeks</TabsTrigger>
          <TabsTrigger value="monthly">Last 6 Months</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6">
          {/* Sales & Expenses Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Sales & Expenses Trend</CardTitle>
              <CardDescription>Track your revenue, expenses, and profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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

          {/* Top Selling Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topItems} margin={{ bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Item: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No sales data available for this period
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