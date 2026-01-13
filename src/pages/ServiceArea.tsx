import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Undo2, ChefHat, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeAMPM, getTimeElapsed, isWithinUndoWindow, formatQuantityWithUnit } from '@/utils/timeUtils';
import { cn } from '@/lib/utils';

// BroadcastChannel for instant cross-tab/cross-device updates
const billsChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bills-updates') : null;

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
        base_value?: number;
    } | null;
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
    const [recentBills, setRecentBills] = useState<ServiceBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingBillId, setProcessingBillId] = useState<string | null>(null);

    // Fetch bills that need service AND recently processed ones
    const fetchBills = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);

        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            // 1. Fetch Active Bills
            const activeQuery = (supabase as any)
                .from('bills')
                .select(`
                    id, bill_no, total_amount, date, created_at,
                    service_status, kitchen_status, status_updated_at,
                    bill_items (
                        id, quantity, price, total,
                        items (id, name, price, unit, base_value)
                    )
                `)
                .eq('date', today)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .in('service_status', ['pending', 'ready', 'preparing'])
                .order('created_at', { ascending: false });

            // 2. Fetch Recently Processed (for Undo)
            const recentQuery = (supabase as any)
                .from('bills')
                .select('id, bill_no, service_status, status_updated_at')
                .eq('date', today)
                .in('service_status', ['completed', 'rejected'])
                .gte('status_updated_at', fiveMinutesAgo)
                .order('status_updated_at', { ascending: false })
                .limit(10);

            const [activeResult, recentResult] = await Promise.all([activeQuery, recentQuery]);

            if (activeResult.error) throw activeResult.error;
            if (recentResult.error) throw recentResult.error;

            setBills(activeResult.data || []);
            setRecentBills(recentResult.data || []);
        } catch (error) {
            console.error('Error fetching service bills:', error);
            // Only show toast if it's a hard load (not polling)
            if (!silent) {
                toast({
                    title: 'Syncing...',
                    description: 'Connection slow, retrying in background',
                    variant: 'default', // Less aggressive than destructive
                });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchBills();

        // Polling fallback every 30 seconds
        const pollInterval = setInterval(() => fetchBills(true), 30000);
        return () => clearInterval(pollInterval);
    }, [fetchBills]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('service-area-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
                fetchBills(true);
                billsChannel?.postMessage({ type: 'update', timestamp: Date.now() });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchBills]);

    // Listen for BroadcastChannel updates
    useEffect(() => {
        if (!billsChannel) return;
        const handleMessage = () => fetchBills(true);
        billsChannel.addEventListener('message', handleMessage);
        return () => billsChannel.removeEventListener('message', handleMessage);
    }, [fetchBills]);

    /**
     * OPTIMISTIC UPDATE: Instant (0ms) response
     */
    const updateBillStatus = async (
        billId: string,
        status: 'completed' | 'rejected' | 'pending'
    ) => {
        // Capture previous state for rollback
        const prevActive = [...bills];
        const prevRecent = [...recentBills];

        // 1. Instant local update (Optimistic UI)
        if (status === 'pending') {
            // Un-doing: Move from recent to active
            const billToRestore = recentBills.find(b => b.id === billId);
            if (billToRestore) {
                setRecentBills(prev => prev.filter(b => b.id !== billId));
                // Note: We don't have full bill_items in the 'recent' query usually, 
                // so we'll wait for the fetch to populate the active list fully,
                // but we can show a placeholder or wait for fetch.
                // For better UX, let's trigger fetchBills(true) immediately.
            }
        } else {
            // Completing/Rejecting: Move from active to recent
            const billToMove = bills.find(b => b.id === billId);
            if (billToMove) {
                setBills(prev => prev.filter(b => b.id !== billId));
                setRecentBills(prev => [{
                    ...billToMove,
                    service_status: status,
                    status_updated_at: new Date().toISOString()
                }, ...prev].slice(0, 10));
            }
        }

        // 2. Perform background update
        try {
            const { error } = await supabase
                .from('bills')
                .update({
                    service_status: status,
                    status_updated_at: new Date().toISOString(),
                } as any)
                .eq('id', billId);

            if (error) throw error;

            toast({
                title: status === 'completed' ? '✅ Bill Done' :
                    status === 'rejected' ? '❌ Bill Rejected' : '↩️ Bill Restored',
                duration: 2000,
            });

            // Refresh in background to sync with server truth
            fetchBills(true);
            billsChannel?.postMessage({ type: 'update', timestamp: Date.now() });
        } catch (error) {
            console.error('Update failed, rolling back:', error);
            // 3. Rollback on failure
            setBills(prevActive);
            setRecentBills(prevRecent);
            toast({
                title: 'Connection Error',
                description: 'Could not update status. Please try again.',
                variant: 'destructive',
            });
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
        return <Badge variant="secondary">PENDING</Badge>;
    };

    if (loading && bills.length === 0) {
        return (
            <div className="p-4 space-y-4">
                <h1 className="text-2xl font-bold">Service Area</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i} className="p-4 animate-pulse h-48 bg-muted/50" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Service Area</h1>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-600">Live</span>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {bills.length} bill{bills.length !== 1 ? 's' : ''} waiting
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchBills()}>
                    Refresh
                </Button>
            </div>

            {/* Active Bills Grid */}
            {bills.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-muted/20">
                    <div className="text-muted-foreground">
                        <Check className="w-16 h-16 mx-auto mb-4 opacity-20 text-green-500" />
                        <p className="text-xl font-bold text-foreground">All caught up!</p>
                        <p className="text-sm">No pending bills to serve</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {bills.map((bill) => (
                        <Card
                            key={bill.id}
                            className={cn(
                                "p-3 flex flex-col transition-all duration-300 shadow-sm hover:shadow-md",
                                bill.kitchen_status === 'ready' && "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-foreground">#{bill.bill_no}</h3>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                        {getTimeElapsed(bill.created_at)}
                                    </span>
                                </div>
                                {getStatusBadge(bill)}
                            </div>

                            <ScrollArea className="flex-1 max-h-[120px] mb-3 pr-2">
                                <div className="space-y-1">
                                    {bill.bill_items.map((item) => (
                                        <div key={item.id} className="flex items-center text-sm">
                                            <span className="font-bold text-primary mr-2">
                                                {formatQuantityWithUnit(item.quantity, item.items?.unit)}
                                            </span>
                                            <span className="text-muted-foreground text-xs mr-1">×</span>
                                            <span className="font-medium truncate">{item.items?.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="flex gap-2 mt-auto">
                                <Button
                                    size="sm"
                                    className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white font-bold"
                                    onClick={() => updateBillStatus(bill.id, 'completed')}
                                >
                                    <Check className="w-4 h-4 mr-1.5" />
                                    Done
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="flex-1 h-10 font-bold"
                                    onClick={() => updateBillStatus(bill.id, 'rejected')}
                                >
                                    <X className="w-4 h-4 mr-1.5" />
                                    Reject
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Recently Processed - Now directly using component state */}
            {recentBills.length > 0 && (
                <div className="mt-8 pt-6 border-t border-dashed">
                    <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
                        <Undo2 className="w-4 h-4" />
                        Recently Processed (Undo)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recentBills.map((bill) => (
                            <Button
                                key={bill.id}
                                variant="outline"
                                size="sm"
                                onClick={() => updateBillStatus(bill.id, 'pending')}
                                disabled={!isWithinUndoWindow(bill.status_updated_at)}
                                className="gap-2 h-10 border-2 hover:bg-muted/50"
                            >
                                <Undo2 className="w-3 h-3 text-muted-foreground" />
                                <span className="font-bold">#{bill.bill_no}</span>
                                <Badge variant={bill.service_status === 'completed' ? 'default' : 'destructive'} className="h-5 px-1.5 min-w-[20px] justify-center">
                                    {bill.service_status === 'completed' ? '✓' : '✗'}
                                </Badge>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceArea;

export default ServiceArea;
