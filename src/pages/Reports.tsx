import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Package, Receipt, CreditCard, BarChart3, Edit, Trash2, Eye, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportAllReportsToExcel, exportAllReportsToPDF } from '@/utils/exportUtils';
import { cachedFetch, CACHE_KEYS, invalidateRelatedData } from '@/utils/cacheUtils';

interface Bill {
  id: string;
  bill_no: string;
  total_amount: number;
  discount: number;
  payment_mode: string;
  date: string;
  created_at: string;
  is_deleted: boolean;
  payment_details?: Record<string, number>;
  additional_charges?: Array<{ name: string; amount: number }>;
  bill_items: BillItem[];
}

interface BillItem {
  id: string;
  quantity: number;
  price: number;
  total: number;
  item_id: string;
  items: {
    name: string;
    category: string;
    is_active?: boolean;
    unit?: string;
  };
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
}

interface ItemReport {
  item_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itemReports, setItemReports] = useState<ItemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billFilter, setBillFilter] = useState('processed');

  const fetchReportsCallback = useCallback(() => {
    fetchReports();
  }, [dateRange, customStartDate, customEndDate, billFilter]);

  useEffect(() => {
    fetchReportsCallback();
  }, [fetchReportsCallback]);

  // Real-time subscription for bills changes
  useEffect(() => {
    console.log('Setting up real-time bills subscription in Reports...');
    
    const channel = supabase
      .channel('reports-bills-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        (payload) => {
          console.log('Bill change detected in Reports:', payload);
          fetchReportsCallback();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time bills subscription in Reports...');
      supabase.removeChannel(channel);
    };
  }, [fetchReportsCallback]);

  const getDateFilter = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (dateRange) {
      case 'today':
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'yesterday':
        return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'all':
        return { start: '2000-01-01', end: today.toISOString().split('T')[0] };
      case 'custom':
        // Validate custom dates
        if (!customStartDate || !customEndDate) {
          return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
        }
        if (new Date(customEndDate) < new Date(customStartDate)) {
          toast({
            title: "Invalid Date Range",
            description: "End date cannot be before start date",
            variant: "destructive",
          });
          return { start: customStartDate, end: customStartDate };
        }
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }
  };

  const fetchReports = async () => {
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) return;
    
    setLoading(true);
    
    try {
      const { start, end } = getDateFilter();
      const cacheKey = `${CACHE_KEYS.REPORTS}_${billFilter}_${start}_${end}`;

      const reportData = await cachedFetch(
        cacheKey,
        async () => {
          // Fetch bills based on filter
          let billsQuery = supabase
            .from('bills')
            .select(`
              *,
              bill_items (
                *,
                items (
                  name,
                  category,
                  is_active
                )
              )
            `)
            .gte('date', start)
            .lte('date', end)
            .order('created_at', { ascending: false });

          // Apply filter for deleted/processed bills
          if (billFilter === 'processed') {
            billsQuery = billsQuery.eq('is_deleted', false);
          } else {
            billsQuery = billsQuery.eq('is_deleted', true);
          }

          const { data: billsData, error: billsError } = await billsQuery;
          if (billsError) throw billsError;

          let expensesData = [];
          let itemReportMap = new Map();

          // Only fetch expenses and item reports for processed bills
          if (billFilter === 'processed') {
            // Fetch expenses
            const { data: expensesResult, error: expensesError } = await supabase
              .from('expenses')
              .select('*')
              .gte('date', start)
              .lte('date', end)
              .order('date', { ascending: false });

            if (expensesError) throw expensesError;
            expensesData = expensesResult || [];

            // Generate item reports
            billsData?.forEach(bill => {
              bill.bill_items?.forEach(item => {
                const key = item.items?.name || 'Unknown';
                const existing = itemReportMap.get(key);
                
                if (existing) {
                  existing.total_quantity += item.quantity;
                  existing.total_revenue += item.total;
                } else {
                  itemReportMap.set(key, {
                    item_name: item.items?.name || 'Unknown',
                    category: item.items?.category || 'Unknown',
                    total_quantity: item.quantity,
                    total_revenue: item.total
                  });
                }
              });
            });
          }

          return {
            bills: billsData || [],
            expenses: expensesData,
            itemReports: Array.from(itemReportMap.values())
          };
        },
        2 * 60 * 1000 // 2 minutes cache
      );

      setBills(reportData.bills.map(bill => ({
        ...bill,
        payment_details: (bill.payment_details as any) || {},
        additional_charges: (bill.additional_charges as any) || []
      })));
      setExpenses(reportData.expenses);
      setItemReports(reportData.itemReports);

    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill? This will mark it as deleted and restore stock.')) return;

    try {
      // Get bill items to restore stock
      const { data: billItems } = await supabase
        .from('bill_items')
        .select('item_id, quantity')
        .eq('bill_id', billId);

      // Mark bill as deleted
      const { error } = await supabase
        .from('bills')
        .update({ is_deleted: true })
        .eq('id', billId);

      if (error) throw error;

      // Restore stock for each item
      if (billItems) {
        for (const item of billItems) {
          const { data: currentItem } = await supabase
            .from('items')
            .select('stock_quantity')
            .eq('id', item.item_id)
            .single();

          if (currentItem) {
            await supabase
              .from('items')
              .update({ stock_quantity: (currentItem.stock_quantity || 0) + item.quantity })
              .eq('id', item.item_id);
          }
        }
      }

      toast({
        title: "Success",
        description: "Bill deleted successfully and stock restored",
      });

      // Invalidate related caches and refresh
      invalidateRelatedData('bills');
      fetchReports();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  const restoreBill = async (billId: string) => {
    if (!confirm('Are you sure you want to restore this bill? This will reduce stock quantities.')) return;

    try {
      // Get bill items to reduce stock
      const { data: billItems } = await supabase
        .from('bill_items')
        .select('item_id, quantity')
        .eq('bill_id', billId);

      // Restore bill
      const { error } = await supabase
        .from('bills')
        .update({ is_deleted: false })
        .eq('id', billId);

      if (error) throw error;

      // Reduce stock for each item
      if (billItems) {
        for (const item of billItems) {
          const { data: currentItem } = await supabase
            .from('items')
            .select('stock_quantity')
            .eq('id', item.item_id)
            .single();

          if (currentItem) {
            await supabase
              .from('items')
              .update({ stock_quantity: (currentItem.stock_quantity || 0) - item.quantity })
              .eq('id', item.item_id);
          }
        }
      }

      toast({
        title: "Success",
        description: "Bill restored successfully"
      });

      // Invalidate related caches and refresh
      invalidateRelatedData('bills');
      fetchReports();
    } catch (error) {
      console.error('Error restoring bill:', error);
      toast({
        title: "Error",
        description: "Failed to restore bill",
        variant: "destructive",
      });
    }
  };

  const editBill = (bill: Bill) => {
    navigate('/billing', { 
      state: { 
        editBill: bill,
        editMode: true 
      } 
    });
  };

  const handleExportAllExcel = () => {
    try {
      const activeBills = bills.filter(bill => !bill.is_deleted);
      const totalSales = activeBills.reduce((sum, bill) => sum + bill.total_amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Prepare bills data
      const billsForExport = activeBills.map(bill => ({
        bill_no: bill.bill_no,
        date: format(new Date(bill.date), 'MMM dd, yyyy'),
        time: format(new Date(bill.created_at), 'hh:mm a'),
        total_amount: bill.total_amount,
        discount: bill.discount,
        payment_mode: bill.payment_mode.toUpperCase(),
        items_count: bill.bill_items?.length || 0
      }));

      // Prepare items data
      const itemsForExport = itemReports.map(item => ({
        item_name: item.item_name,
        category: item.category,
        total_quantity: item.total_quantity,
        total_revenue: item.total_revenue
      }));

      // Prepare payments data
      const paymentMethodSummary = activeBills.reduce((acc, bill) => {
        acc[bill.payment_mode] = (acc[bill.payment_mode] || 0) + bill.total_amount;
        return acc;
      }, {} as Record<string, number>);

      const paymentsForExport = Object.entries(paymentMethodSummary).map(([method, amount]) => ({
        payment_method: method.toUpperCase(),
        total_amount: amount,
        transaction_count: activeBills.filter(b => b.payment_mode === method).length,
        percentage: ((amount / totalSales) * 100)
      }));

      // Prepare P&L data
      const profitLossForExport = [
        { description: 'Total Sales', amount: totalSales, type: 'revenue' as const },
        { description: 'Total Expenses', amount: totalExpenses, type: 'expense' as const }
      ];

      const dateRangeText = dateRange === 'custom' 
        ? `${customStartDate} to ${customEndDate}`
        : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

      exportAllReportsToExcel({
        bills: billsForExport,
        items: itemsForExport,
        payments: paymentsForExport,
        profitLoss: profitLossForExport,
        dateRange: dateRangeText
      });

      toast({
        title: "Success",
        description: "All reports exported to Excel successfully!",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  const handleExportAllPDF = () => {
    try {
      const activeBills = bills.filter(bill => !bill.is_deleted);
      const totalSales = activeBills.reduce((sum, bill) => sum + bill.total_amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Prepare bills data
      const billsForExport = activeBills.map(bill => ({
        bill_no: bill.bill_no,
        date: format(new Date(bill.date), 'MMM dd, yyyy'),
        time: format(new Date(bill.created_at), 'hh:mm a'),
        total_amount: bill.total_amount,
        discount: bill.discount,
        payment_mode: bill.payment_mode.toUpperCase(),
        items_count: bill.bill_items?.length || 0
      }));

      // Prepare items data
      const itemsForExport = itemReports.map(item => ({
        item_name: item.item_name,
        category: item.category,
        total_quantity: item.total_quantity,
        total_revenue: item.total_revenue
      }));

      // Prepare payments data
      const paymentMethodSummary = activeBills.reduce((acc, bill) => {
        acc[bill.payment_mode] = (acc[bill.payment_mode] || 0) + bill.total_amount;
        return acc;
      }, {} as Record<string, number>);

      const paymentsForExport = Object.entries(paymentMethodSummary).map(([method, amount]) => ({
        payment_method: method.toUpperCase(),
        total_amount: amount,
        transaction_count: activeBills.filter(b => b.payment_mode === method).length,
        percentage: ((amount / totalSales) * 100)
      }));

      // Prepare P&L data
      const profitLossForExport = [
        { description: 'Total Sales', amount: totalSales, type: 'revenue' as const },
        { description: 'Total Expenses', amount: totalExpenses, type: 'expense' as const }
      ];

      const dateRangeText = dateRange === 'custom' 
        ? `${customStartDate} to ${customEndDate}`
        : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

      exportAllReportsToPDF({
        bills: billsForExport,
        items: itemsForExport,
        payments: paymentsForExport,
        profitLoss: profitLossForExport,
        dateRange: dateRangeText
      });

      toast({
        title: "Success",
        description: "All reports exported to PDF successfully!",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF file",
        variant: "destructive",
      });
    }
  };

  const activeBills = bills.filter(bill => !bill.is_deleted);
  const totalSales = activeBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = totalSales - totalExpenses;

  const paymentMethodSummary = activeBills.reduce((acc, bill) => {
    acc[bill.payment_mode] = (acc[bill.payment_mode] || 0) + bill.total_amount;
    return acc;
  }, {} as Record<string, number>);

  if (profile?.role !== 'admin') {
    return (
      <div className="p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/dd6a09aa-ab49-41aa-87d8-5ee1b772cb75.png" 
            alt="Restaurant" 
            className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" 
          />
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Business insights and performance metrics</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleExportAllExcel} variant="outline" size="sm" className="text-xs">
            <FileSpreadsheet className="w-3 h-3 mr-1" />
            Export Excel
          </Button>
          <Button onClick={handleExportAllPDF} variant="outline" size="sm" className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="p-3 sm:p-4">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <CalendarDays className="w-4 h-4" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Only show for processed bills */}
      {billFilter === 'processed' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-2 sm:p-3">
            <CardContent className="p-0">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="text-sm sm:text-lg font-bold text-primary">₹{totalSales.toFixed(2)}</p>
                <TrendingUp className="w-4 h-4 mx-auto text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-3">
            <CardContent className="p-0">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-sm sm:text-lg font-bold text-destructive">₹{totalExpenses.toFixed(2)}</p>
                <TrendingDown className="w-4 h-4 mx-auto text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-3">
            <CardContent className="p-0">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`text-sm sm:text-lg font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ₹{profit.toFixed(2)}
                </p>
                <DollarSign className={`w-4 h-4 mx-auto ${profit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Reports */}
      <Tabs defaultValue="bills" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[300px] h-8">
            <TabsTrigger value="bills" className="text-xs">Bills</TabsTrigger>
            <TabsTrigger value="items" disabled={billFilter === 'deleted'} className="text-xs">Items</TabsTrigger>
            <TabsTrigger value="payments" disabled={billFilter === 'deleted'} className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="profit" disabled={billFilter === 'deleted'} className="text-xs">P&L</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bills" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Receipt className="w-4 h-4" />
                  Bill-wise Report
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Filter:</Label>
                  <Select value={billFilter} onValueChange={setBillFilter}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-xs">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div 
                      key={bill.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        billFilter === 'deleted' 
                          ? 'bg-destructive/10 border border-destructive/20' 
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{bill.bill_no}</h3>
                          {bill.is_deleted && (
                            <Badge variant="destructive" className="text-xs">
                              Deleted
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>{format(new Date(bill.date), 'MMM dd, yyyy')}</span>
                          <span>{bill.payment_mode.toUpperCase()} • {bill.bill_items?.length || 0} items</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-semibold text-sm text-primary whitespace-nowrap">₹{bill.total_amount.toFixed(2)}</p>
                          {bill.discount > 0 && (
                            <p className="text-xs text-success whitespace-nowrap">-₹{bill.discount.toFixed(2)}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBill(bill)}
                            className="h-7 w-7 p-0 flex-shrink-0"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {billFilter === 'processed' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteBill(bill.id)}
                              className="h-7 w-7 p-0 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreBill(bill.id)}
                              className="h-7 w-7 p-0 flex-shrink-0"
                              title="Restore"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {bills.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No {billFilter} bills found for selected period
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Package className="w-4 h-4" />
                Item-wise Sales Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-xs">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {itemReports.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{item.item_name}</h3>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">Qty: {item.total_quantity}</p>
                        <p className="text-xs text-primary">₹{item.total_revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {itemReports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No item sales data for selected period
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="w-4 h-4" />
                Payment Method Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-xs">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(paymentMethodSummary).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-sm capitalize">{method}</h3>
                        <p className="text-xs text-muted-foreground">
                          {bills.filter(b => b.payment_mode === method).length} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-primary">₹{amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {((amount / totalSales) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {Object.keys(paymentMethodSummary).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No payment data for selected period
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <BarChart3 className="w-4 h-4" />
                Profit & Loss Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-success mb-3">Revenue</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Total Sales</span>
                        <span className="font-semibold">₹{totalSales.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Number of Bills</span>
                        <span className="font-semibold">{bills.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Bill Value</span>
                        <span className="font-semibold">
                          ₹{bills.length > 0 ? (totalSales / bills.length).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-destructive mb-3">Expenses</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Total Expenses</span>
                        <span className="font-semibold">₹{totalExpenses.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Number of Expenses</span>
                        <span className="font-semibold">{expenses.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Expense</span>
                        <span className="font-semibold">
                          ₹{expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Net Profit/Loss</span>
                    <span className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                      ₹{profit.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Profit Margin: {totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : '0.00'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bill Details Dialog */}
      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Bill Details - {selectedBill.bill_no}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="font-medium">Date:</p>
                  <p>{format(new Date(selectedBill.date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="font-medium">Processed Time:</p>
                  <p>{format(new Date(selectedBill.created_at), 'MMM dd, yyyy hh:mm a')}</p>
                </div>
                <div>
                  <p className="font-medium">Payment Mode:</p>
                  <p className="capitalize">{selectedBill.payment_mode}</p>
                </div>
                <div>
                  <p className="font-medium">Total Amount:</p>
                  <p className="font-bold text-lg">₹{selectedBill.total_amount.toFixed(2)}</p>
                </div>
              </div>
              
              {selectedBill.discount > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-green-800">
                    Discount Applied: ₹{selectedBill.discount.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3 text-sm">Items ({selectedBill.bill_items?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedBill.bill_items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.items?.name}</p>
                          {item.items?.is_active === false && (
                            <Badge variant="destructive" className="text-xs">
                              Deleted Item
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.items?.category} • ₹{item.price}/{(item.items as any)?.unit || 'pc'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">Qty: {item.quantity}</p>
                        <p className="text-xs">₹{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details (Split Payment) */}
              {selectedBill.payment_details && Object.keys(selectedBill.payment_details).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 text-sm">Payment Split Details</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedBill.payment_details).map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                        <span className="capitalize font-medium">{method}</span>
                        <span className="font-semibold">₹{Number(amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Reports;
