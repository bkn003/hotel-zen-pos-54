
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invalidateRelatedData, dataCache, CACHE_KEYS } from '@/utils/cacheUtils';
import { toast } from '@/hooks/use-toast';

export const useRealTimeUpdates = () => {
  useEffect(() => {
    console.log('Setting up real-time updates...');

    // Listen for bills changes
    const billsChannel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        (payload) => {
          console.log('Bills change detected:', payload);
          invalidateRelatedData('bills');
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Bill Created",
              description: "Data refreshed automatically",
            });
          }
        }
      )
      .subscribe();

    // Listen for items changes
    const itemsChannel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        (payload) => {
          console.log('Items change detected:', payload);
          invalidateRelatedData('items');
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Item Added",
              description: "Menu updated automatically",
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Item Updated",
              description: "Menu refreshed automatically",
            });
          }
        }
      )
      .subscribe();

    // Listen for expenses changes
    const expensesChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('Expenses change detected:', payload);
          invalidateRelatedData('expenses');
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Expense Added",
              description: "Expenses updated automatically",
            });
          }
        }
      )
      .subscribe();

    // Listen for payment method changes
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payments change detected:', payload);
          invalidateRelatedData('payments');
          dataCache.invalidate(CACHE_KEYS.PAYMENT_METHODS);
          
          toast({
            title: "Payment Methods Updated",
            description: "Data refreshed automatically",
          });
        }
      )
      .subscribe();

    // Listen for category changes
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_categories'
        },
        (payload) => {
          console.log('Categories change detected:', payload);
          dataCache.invalidate(CACHE_KEYS.EXPENSE_CATEGORIES);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_categories'
        },
        (payload) => {
          console.log('Item categories change detected:', payload);
          dataCache.invalidate(CACHE_KEYS.ITEM_CATEGORIES);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);
};
