import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, Bell, Volume2, VolumeX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getTimeElapsed, formatTimeAMPM, formatQuantityWithUnit } from '@/utils/timeUtils';
import { cn } from '@/lib/utils';

// BroadcastChannel for instant cross-tab sync
const billsChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bills-updates') : null;

// Type definition for kitchen bills
interface KitchenBillItem {
    id: string;
    quantity: number;
    items: {
        id: string;
        name: string;
        unit?: string;
        base_value?: number;
    } | null;
}

interface KitchenBill {
    id: string;
    bill_no: string;
    created_at: string;
    kitchen_status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected';
    service_status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected';
    bill_items: KitchenBillItem[];
}

const KitchenDisplay = () => {
    const [bills, setBills] = useState<KitchenBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingBillId, setProcessingBillId] = useState<string | null>(null);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const syncChannelRef = useRef<any>(null);

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Voice announcement function
    const announce = useCallback((text: string) => {
        if (!voiceEnabled || !('speechSynthesis' in window)) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    // Fetch kitchen orders
    const fetchBills = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const query = (supabase as any)
                .from('bills')
                .select(`
                    id, bill_no, created_at, kitchen_status, service_status,
                    bill_items (
                        id, quantity, items (id, name, unit, base_value)
                    )
                `)
                .eq('date', today)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .in('kitchen_status', ['pending', 'preparing', 'ready'])
                .neq('service_status', 'completed')
                .neq('service_status', 'rejected')
                .order('created_at', { ascending: true });

            const result = await query;
            if (result.error) throw result.error;
            setBills(result.data || []);
        } catch (error) {
            console.error('Error fetching kitchen bills:', error);
            if (!silent) {
                toast({
                    title: 'Syncing...',
                    description: 'Connection slow, retrying in background',
                });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Track known bill IDs to detect new orders
    const knownBillIds = useRef<Set<string>>(new Set());

    // Setup Global Sync Channel for Cross-Device updates
    useEffect(() => {
        const channel = supabase.channel('pos-global-sync', {
            config: { broadcast: { self: true } }
        })
            .on('broadcast', { event: 'bills-updated' }, (payload: any) => {
                console.log('Kitchen: Cross-device broadcast received!', payload);
                fetchBills(true);
            })
            .on('broadcast', { event: 'new-bill' }, (payload: any) => {
                // INSTANT voice announcement via Supabase Broadcast
                console.log('Kitchen: New bill broadcast received!', payload);
                if (voiceEnabled && payload?.payload?.bill_no) {
                    announce(`New order received, Bill number ${payload.payload.bill_no}`);
                }
                fetchBills(true);
            })
            .subscribe();

        syncChannelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, [fetchBills, voiceEnabled, announce]);

    // Initial fetch
    useEffect(() => {
        fetchBills();
        const pollInterval = setInterval(() => fetchBills(true), 30000);
        return () => clearInterval(pollInterval);
    }, [fetchBills]);

    // Realtime subscription (backup - slower but reliable)
    useEffect(() => {
        const channel = supabase
            .channel('kitchen-sync')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bills' }, (payload) => {
                // Only announce if we haven't already (prevents duplicate announcements)
                const billNo = payload.new?.bill_no;
                const billId = payload.new?.id;
                if (billId && !knownBillIds.current.has(billId)) {
                    knownBillIds.current.add(billId);
                    if (voiceEnabled && billNo) {
                        announce(`New order received, Bill number ${billNo}`);
                    }
                }
                fetchBills(true);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bills' }, () => {
                fetchBills(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchBills, voiceEnabled, announce]);

    // Listen for BroadcastChannel updates (0ms same-device sync)
    useEffect(() => {
        if (!billsChannel) return;

        const handleMessage = (event: MessageEvent) => {
            const data = event.data;

            // INSTANT voice for new bills on same device
            if (data?.type === 'new-bill' && voiceEnabled && data?.bill_no) {
                // Only announce if we haven't seen this bill
                if (data?.bill_id && !knownBillIds.current.has(data.bill_id)) {
                    knownBillIds.current.add(data.bill_id);
                    announce(`New order received, Bill number ${data.bill_no}`);
                }
            }

            fetchBills(true);
        };

        billsChannel.addEventListener('message', handleMessage);
        return () => billsChannel.removeEventListener('message', handleMessage);
    }, [fetchBills, voiceEnabled, announce]);

    /**
     * OPTIMISTIC UPDATE: Instant (0ms) response
     */
    const updateKitchenStatus = async (
        billId: string,
        billNo: string,
        status: 'preparing' | 'ready'
    ) => {
        const prevBills = [...bills];

        // 1. Instant local update (Optimistic UI)
        setBills(prev => prev.map(bill =>
            bill.id === billId
                ? { ...bill, kitchen_status: status, service_status: status === 'ready' ? 'ready' : bill.service_status }
                : bill
        ));

        // 2. Perform background update
        try {
            const updateData: any = { kitchen_status: status };
            if (status === 'ready') updateData.service_status = 'ready';

            const { error } = await supabase
                .from('bills')
                .update(updateData)
                .eq('id', billId);

            if (error) throw error;

            if (status === 'ready') {
                announce(`Bill number ${billNo} is ready`);
                toast({ title: '🔔 Order Ready!', description: `Bill #${billNo} is ready` });
            } else {
                toast({ title: '👨‍🍳 Preparing', description: `Started #${billNo}` });
            }

            // Sync others (Same-device 0ms, Cross-device <200ms)
            billsChannel?.postMessage({ type: 'update', timestamp: Date.now() });
            syncChannelRef.current?.send({
                type: 'broadcast',
                event: 'bills-updated',
                payload: { bill_id: billId, status }
            });
        } catch (error) {
            console.error('Update failed:', error);
            // 3. Rollback on failure
            setBills(prevBills);
            toast({
                title: 'Update Failed',
                description: 'Please check your connection',
                variant: 'destructive'
            });
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'preparing': return 'bg-orange-500';
            case 'ready': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    // Group bills by status
    const pendingBills = bills.filter(b => b.kitchen_status === 'pending');
    const preparingBills = bills.filter(b => b.kitchen_status === 'preparing');
    const readyBills = bills.filter(b => b.kitchen_status === 'ready');

    const handleRefreshClick = () => {
        fetchBills();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header Bar */}
            <div className="bg-card border-b sticky top-0 z-10 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-xl font-bold">Kitchen Display</h1>
                            <p className="text-xs text-muted-foreground">
                                {formatTimeAMPM(currentTime)} • {bills.length} active orders
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-600">Live</span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={cn(voiceEnabled && "bg-primary text-primary-foreground")}
                        >
                            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRefreshClick}>
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* PENDING Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <h2 className="text-lg font-semibold">New Orders</h2>
                            <Badge variant="secondary">{pendingBills.length}</Badge>
                        </div>

                        {pendingBills.map((bill) => (
                            <KitchenOrderCard
                                key={bill.id}
                                bill={bill}
                                processing={processingBillId === bill.id}
                                onAction={() => updateKitchenStatus(bill.id, bill.bill_no, 'preparing')}
                                actionLabel="Start Preparing"
                                actionColor="bg-orange-500 hover:bg-orange-600"
                            />
                        ))}

                        {pendingBills.length === 0 && (
                            <Card className="p-6 text-center text-muted-foreground">
                                No new orders
                            </Card>
                        )}
                    </div>

                    {/* PREPARING Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                            <h2 className="text-lg font-semibold">Preparing</h2>
                            <Badge variant="secondary">{preparingBills.length}</Badge>
                        </div>

                        {preparingBills.map((bill) => (
                            <KitchenOrderCard
                                key={bill.id}
                                bill={bill}
                                processing={processingBillId === bill.id}
                                onAction={() => updateKitchenStatus(bill.id, bill.bill_no, 'ready')}
                                actionLabel="Mark Ready"
                                actionColor="bg-green-500 hover:bg-green-600"
                            />
                        ))}

                        {preparingBills.length === 0 && (
                            <Card className="p-6 text-center text-muted-foreground">
                                Nothing cooking
                            </Card>
                        )}
                    </div>

                    {/* READY Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <h2 className="text-lg font-semibold">Ready to Serve</h2>
                            <Badge variant="secondary">{readyBills.length}</Badge>
                        </div>

                        {readyBills.map((bill) => (
                            <Card
                                key={bill.id}
                                className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-3xl font-bold text-green-600">
                                        #{bill.bill_no}
                                    </h3>
                                    <Badge className="bg-green-500 text-white animate-pulse">
                                        <Bell className="w-3 h-3 mr-1" />
                                        READY
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {getTimeElapsed(bill.created_at)} ago
                                </div>
                            </Card>
                        ))}

                        {readyBills.length === 0 && (
                            <Card className="p-6 text-center text-muted-foreground">
                                No orders ready
                            </Card>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

// Kitchen Order Card Component
interface KitchenOrderCardProps {
    bill: KitchenBill;
    processing: boolean;
    onAction: () => void;
    actionLabel: string;
    actionColor: string;
}

const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
    bill,
    processing,
    onAction,
    actionLabel,
    actionColor,
}) => {
    return (
        <Card className={cn("p-4", processing && "opacity-50")}>
            {/* Bill Header */}
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-2xl font-bold">#{bill.bill_no}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {getTimeElapsed(bill.created_at)}
                </div>
            </div>

            {/* Items List - no scroll, show all */}
            <div className="space-y-1 mb-3">
                {bill.bill_items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="font-medium">
                            {item.items?.name || 'Unknown'}
                        </span>
                        <Badge variant="outline" className="font-bold">
                            {formatQuantityWithUnit(item.quantity, item.items?.unit)}
                        </Badge>
                    </div>
                ))}
            </div>

            {/* Items/Qty Count Footer */}
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-t pt-2 mb-3">
                <span>Items: {bill.bill_items.length}</span>
                <span>Qty: {bill.bill_items.reduce((acc, item) => {
                    const unit = item.items?.unit?.toLowerCase() || '';
                    const isWeightVolume = unit.includes('gram') || unit.includes('kg') ||
                        unit.includes('liter') || unit.includes('ml') ||
                        unit === 'g' || unit === 'l';
                    return acc + (isWeightVolume ? 1 : item.quantity);
                }, 0)}</span>
            </div>

            {/* Action Button */}
            <Button
                className={cn("w-full text-white", actionColor)}
                onClick={onAction}
                disabled={processing}
            >
                {actionLabel}
            </Button>

        </Card>
    );
};

export default KitchenDisplay;