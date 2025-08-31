
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit2, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { AddExpenseDialog } from '@/components/AddExpenseDialog';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';
import { CategoryManagement } from '@/components/CategoryManagement';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface Expense {
  id: string;
  expense_name: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  created_at: string;
  created_by: string;
}

const Expenses = () => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isMobile) {
      // 12-hour format for mobile
      return format(date, 'h:mm a');
    } else {
      // 24-hour format for desktop
      return format(date, 'HH:mm');
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
      
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  const filteredExpenses = expenses.filter(expense => 
    expense.expense_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowCategoryManagement(true)}
            variant="outline"
            size="sm"
          >
            Manage Categories
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center relative max-w-md">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Expenses List - Horizontal Scroll */}
      <div className="w-full">
        <h2 className="text-lg font-semibold mb-3">All Expenses</h2>
        <div className="w-full overflow-x-auto">
          <div className="flex gap-3 pb-3" style={{ minWidth: 'max-content' }}>
            {filteredExpenses.map(expense => (
              <Card key={expense.id} className="w-72 flex-shrink-0 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-primary">
                        {expense.expense_name || 'Unnamed Expense'}
                      </CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(expense.date)} at {formatTime(expense.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(expense.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                      <span className="text-xl font-bold text-green-600">
                        ₹{expense.amount.toLocaleString()}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      {expense.category}
                    </span>
                  </div>
                  {expense.note && (
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {expense.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredExpenses.length === 0 && (
              <div className="w-full text-center py-8 text-muted-foreground">
                No expenses found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddExpenseDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onExpenseAdded={fetchExpenses}
      />

      {editingExpense && (
        <EditExpenseDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          expense={editingExpense}
          onExpenseUpdated={fetchExpenses}
        />
      )}

      <CategoryManagement
        open={showCategoryManagement}
        onOpenChange={setShowCategoryManagement}
        type="expense"
      />
    </div>
  );
};

export default Expenses;
