import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Undo2, ChefHat, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeAMPM, getTimeElapsed, isWithinUndoWindow } from '@/utils/timeUtils';
import { cn } from '@/lib/utils';

// Types
interface BillItem {
    id: string;
    quantity: number;
    price: number;
    total: number;
    items: {
        id: string;
        name: string;
        price: number;
        unit?: string;
    };
}

interface ServiceBill {
    id: string;
    bill_no: string;
    total_amount: number;
    date: string;
    created_at: string;
    service_status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected';
    kitchen_status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected';
    status_updated_at: string;
    bill_items: BillItem[];
}

const ServiceArea = () => {
    const { profile } = useAuth();
    const [bills, setBills] = useState<ServiceBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingBillId, setProcessingBillId] = useState<string | null>(null);

    // Fetch bills that need service
    const fetchBills = useCallback(async () => {
        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('bills')
                .select(`
          id,
          bill_no,
          total_amount,
          date,
          created_at,
          service_status,
          kitchen_status,
          status_updated_at,
          bill_items (
            id,
            quantity,
            price,
            total,
            items (
              id,
              name,
              price,
              unit
            )
          )
        `)
                .eq('date', today)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .in('service_status', ['pending', 'ready', 'preparing'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`Service Area: Fetched ${data?.length || 0} bills for ${today}`);
            setBills((data as unknown as ServiceBill[]) || []);
        } catch (error) {
            console.error('Error fetching service bills:', error);
            toast({
                title: 'Error',
                description: 'Failed to load bills',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchBills();

        // Polling fallback every 30 seconds
        const pollInterval = setInterval(() => {
            console.log('Service Area: Polling for updates...');
            fetchBills();
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [fetchBills]);

    // Realtime subscription
    useEffect(() => {
        console.log('Service Area: Setting up realtime subscription...');
        const channel = supabase
            .channel('service-area-bills-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bills',
                },
                (payload) => {
                    console.log('Service Area: Realtime change detected!', payload);
                    fetchBills();
                }
            )
            .subscribe((status) => {
                console.log('Service Area: Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Service Area: Successfully joined realtime channel');
                }
            });

        return () => {
            console.log('Service Area: Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [fetchBills]);

    // Update bill status
    const updateBillStatus = async (
        billId: string,
        status: 'completed' | 'rejected' | 'pending'
    ) => {
        setProcessingBillId(billId);

        try {
            // Type assertion needed until database migration is applied and types regenerated
            const { error } = await supabase
                .from('bills')
                .update({
                    service_status: status,
                    status_updated_at: new Date().toISOString(),
                } as any)
                .eq('id', billId);

            if (error) throw error;

            toast({
                title: status === 'completed' ? '✅ Completed' :
                    status === 'rejected' ? '❌ Rejected' : '↩️ Reverted',
                description: `Bill status updated`,
            });

            // Update local state immediately for responsiveness
            setBills(prev =>
                status === 'pending'
                    ? prev // Will be fetched by realtime
                    : prev.filter(b => b.id !== billId)
            );
        } catch (error) {
            console.error('Error updating bill status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update bill status',
                variant: 'destructive',
            });
        } finally {
            setProcessingBillId(null);
        }
    };

    // Get status badge color
    const getStatusBadge = (bill: ServiceBill) => {
        if (bill.kitchen_status === 'ready') {
            return (
                <Badge className="bg-green-500 text-white animate-pulse">
                    <ChefHat className="w-3 h-3 mr-1" />
                    READY
                </Badge>
            );
        }
        if (bill.kitchen_status === 'preparing') {
            return (
                <Badge className="bg-orange-500 text-white">
                    <Clock className="w-3 h-3 mr-1" />
                    PREPARING
                </Badge>
            );
        }
        return (
            <Badge variant="secondary">
                PENDING
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <h1 className="text-2xl font-bold">Service Area</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-4 animate-pulse">
                            <div className="h-6 bg-muted rounded w-1/2 mb-3" />
                            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Service Area</h1>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[8px] uppercase tracking-wider font-bold text-green-600">Live</span>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {bills.length} bill{bills.length !== 1 ? 's' : ''} waiting for service
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchBills()}
                >
                    Refresh
                </Button>
            </div>

            {/* Bills Grid */}
            {bills.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="text-muted-foreground">
                        <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">All caught up!</p>
                        <p className="text-sm">No bills waiting for service</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {bills.map((bill) => (
                        <Card
                            key={bill.id}
                            className={cn(
                                "p-2 sm:p-3 transition-all duration-300",
                                bill.kitchen_status === 'ready' && "ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20",
                                processingBillId === bill.id && "opacity-50"
                            )}
                        >
                            {/* Compact Bill Header */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                                        #{bill.bill_no}
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground">
                                        {getTimeElapsed(bill.created_at)}
                                    </span>
                                </div>
                                {getStatusBadge(bill)}
                            </div>

                            {/* All Items - No Scroll, Compact Layout */}
                            <div className="border-t border-b py-1.5 my-1.5">
                                <div className="space-y-0.5">
                                    {bill.bill_items.map((item) => {
                                        const unit = item.items?.unit || 'pcs';
                                        const shortUnit = unit.replace(/pieces?/i, 'pc').replace(/grams?/i, 'g').replace(/milliliters?|ml/i, 'ml').replace(/liters?/i, 'L').replace(/kilograms?|kg/i, 'kg');

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between text-xs sm:text-sm"
                                            >
                                                <span className="font-medium truncate flex-1 pr-2">
                                                    {item.quantity}× {item.items?.name || 'Item'}
                                                </span>
                                                <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
                                                    {shortUnit}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Compact Action Buttons */}
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                                    onClick={() => updateBillStatus(bill.id, 'completed')}
                                    disabled={processingBillId === bill.id}
                                >
                                    <Check className="w-3 h-3 mr-1" />
                                    Done
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => updateBillStatus(bill.id, 'rejected')}
                                    disabled={processingBillId === bill.id}
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    Reject
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Recently Completed (for Undo) */}
            <RecentlyCompletedSection onUndo={(billId) => updateBillStatus(billId, 'pending')} />
        </div>
    );
};

// Recently Completed Bills for Undo
const RecentlyCompletedSection: React.FC<{ onUndo: (billId: string) => void }> = ({ onUndo }) => {
    const [recentBills, setRecentBills] = useState<ServiceBill[]>([]);

    useEffect(() => {
        const fetchRecent = async () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { data } = await supabase
                .from('bills')
                .select('id, bill_no, service_status, status_updated_at')
                .in('service_status', ['completed', 'rejected'])
                .gte('status_updated_at', fiveMinutesAgo)
                .order('status_updated_at', { ascending: false })
                .limit(5);

            setRecentBills((data as unknown as ServiceBill[]) || []);
        };

        fetchRecent();

        // Refresh every 30 seconds to update undo availability
        const interval = setInterval(fetchRecent, 30000);
        return () => clearInterval(interval);
    }, []);

    if (recentBills.length === 0) return null;

    return (
        <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Recently Processed (Undo available)
            </h3>
            <div className="flex flex-wrap gap-2">
                {recentBills.map((bill) => (
                    <Button
                        key={bill.id}
                        variant="outline"
                        size="sm"
                        onClick={() => onUndo(bill.id)}
                        disabled={!isWithinUndoWindow(bill.status_updated_at)}
                        className="gap-1"
                    >
                        <Undo2 className="w-3 h-3" />
                        #{bill.bill_no}
                        <Badge variant={bill.service_status === 'completed' ? 'default' : 'destructive'} className="ml-1 text-xs">
                            {bill.service_status === 'completed' ? '✓' : '✗'}
                        </Badge>
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default ServiceArea;
