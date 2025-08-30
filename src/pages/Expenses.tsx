import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Receipt, Search, Calendar, Filter } from 'lucide-react';
import { AddExpenseDialog } from '@/components/AddExpenseDialog';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';
import { CategorySelector } from '@/components/CategorySelector';
import { cachedFetch, CACHE_KEYS, dataCache } from '@/utils/cacheUtils';

interface Expense {
  id: string;
  expense_name?: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  created_by: string;
  created_at: string;
}

const Expenses: React.FC = () => {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, expenses, startDate, endDate, dateFilter]);

  const fetchExpenses = async () => {
    try {
      const data = await cachedFetch(
        `${CACHE_KEYS.EXPENSES}_list`,
        async () => {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

          if (error) throw error;
          return data || [];
        }
      );
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = expenses;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.expense_name?.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
        expense.note?.toLowerCase().includes(searchLower) ||
        expense.amount.toString().includes(searchTerm)
      );
    }

    // Date filter
    if (dateFilter === 'custom' && startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      if (endDateObj < startDateObj) {
        toast({
          title: "Error",
          description: "End date cannot be before start date",
          variant: "destructive",
        });
        return;
      }
      
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDateObj && expenseDate <= endDateObj;
      });
    } else if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(expense => expense.date === today);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      filtered = filtered.filter(expense => expense.date === yesterdayStr);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(expense => new Date(expense.date) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(expense => new Date(expense.date) >= monthAgo);
    }

    setFilteredExpenses(filtered);
  };

  const handleCategoriesUpdated = () => {
    // Invalidate categories cache and refetch expenses
    dataCache.invalidate(CACHE_KEYS.CATEGORIES);
    fetchExpenses();
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });

      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Receipt className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground text-sm">Track your business expenses</p>
          </div>
        </div>
        <div className="flex gap-2">
          {profile?.role === 'admin' && (
            <>
              <CategorySelector onCategoriesUpdated={handleCategoriesUpdated} />
              <AddExpenseDialog onExpenseAdded={fetchExpenses} />
            </>
          )}
        </div>
      </div>

      {/* Date Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Date Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All Time' },
              { key: 'custom', label: 'Custom' }
            ].map(filter => (
              <Button
                key={filter.key}
                variant={dateFilter === filter.key ? "default" : "outline"}
                onClick={() => setDateFilter(filter.key)}
                className="text-xs sm:text-sm flex-shrink-0 px-3"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Search Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, category, note, or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-full"
          />
        </CardContent>
      </Card>

      {/* Expenses List - Horizontal Scroll */}
      <Card>
        <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <span className="text-base sm:text-lg">All Expenses ({filteredExpenses.length})</span>
          {filteredExpenses.length > 0 && (
            <div className="text-left sm:text-right">
              <p className="text-base sm:text-lg font-bold text-destructive">
                Total: ₹{totalExpenses.toFixed(2)}
              </p>
            </div>
          )}
        </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Expenses Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || dateFilter !== 'all' ? 'No expenses match your search criteria.' : 'No expenses recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} className="p-3 sm:p-4 flex-shrink-0 w-80 min-w-[280px]">
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <h4 className="font-medium text-base sm:text-lg truncate">
                        {expense.expense_name || 'Unnamed Expense'}
                      </h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {expense.category}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base sm:text-lg text-red-600">
                        -₹{expense.amount.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Date: {new Date(expense.date).toLocaleDateString()}</div>
                      <div className="truncate">Created: {new Date(expense.created_at).toLocaleDateString()} at {new Date(expense.created_at).toLocaleTimeString()}</div>
                    </div>
                    
                    {expense.note && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded break-words">
                        {expense.note}
                      </div>
                    )}
                    
                    {profile?.role === 'admin' && (
                      <div className="pt-2 flex flex-col gap-2">
                        <EditExpenseDialog expense={expense} onExpenseUpdated={fetchExpenses} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm w-full"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
