// Offline Manager with IndexedDB persistence and sync queue
// Provides robust offline functionality for the POS application

const DB_NAME = 'HotelPOS_OfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
    ITEMS: 'items',
    BILLS: 'bills',
    CATEGORIES: 'categories',
    SYNC_QUEUE: 'syncQueue',
    SETTINGS: 'settings'
};

interface SyncQueueItem {
    id: string;
    type: 'bill' | 'expense' | 'item';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
}

class OfflineManager {
    private db: IDBDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;
    private listeners: Set<(isOnline: boolean) => void> = new Set();

    constructor() {
        this.initializeDB();
        this.setupNetworkListeners();
    }

    private async initializeDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores
                if (!db.objectStoreNames.contains(STORES.ITEMS)) {
                    const itemStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'id' });
                    itemStore.createIndex('is_active', 'is_active');
                    itemStore.createIndex('category', 'category');
                }

                if (!db.objectStoreNames.contains(STORES.BILLS)) {
                    const billStore = db.createObjectStore(STORES.BILLS, { keyPath: 'id' });
                    billStore.createIndex('date', 'date');
                    billStore.createIndex('synced', 'synced');
                }

                if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
                    db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                    syncStore.createIndex('timestamp', 'timestamp');
                    syncStore.createIndex('type', 'type');
                }

                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }

                console.log('IndexedDB stores created');
            };
        });
    }

    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners();
            this.processSyncQueue();
            console.log('Network: Online - Starting sync');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners();
            console.log('Network: Offline mode active');
        });
    }

    // Subscribe to network status changes
    onNetworkChange(callback: (isOnline: boolean) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.isOnline));
    }

    getNetworkStatus(): boolean {
        return this.isOnline;
    }

    // Generic store operations
    async store<T>(storeName: string, data: T): Promise<void> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async storeMany<T>(storeName: string, items: T[]): Promise<void> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            items.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async get<T>(storeName: string, key: string): Promise<T | null> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll<T>(storeName: string): Promise<T[]> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, key: string): Promise<void> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName: string): Promise<void> {
        if (!this.db) await this.initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Sync queue operations
    async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        const queueItem: SyncQueueItem = {
            ...item,
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            retryCount: 0
        };

        await this.store(STORES.SYNC_QUEUE, queueItem);
        console.log('Added to sync queue:', queueItem.type, queueItem.action);
    }

    async getSyncQueue(): Promise<SyncQueueItem[]> {
        return this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    }

    async removeFromSyncQueue(id: string): Promise<void> {
        await this.delete(STORES.SYNC_QUEUE, id);
    }

    async processSyncQueue(): Promise<void> {
        if (this.syncInProgress || !this.isOnline) return;

        this.syncInProgress = true;
        console.log('Starting sync queue processing...');

        try {
            const queue = await this.getSyncQueue();

            for (const item of queue) {
                try {
                    await this.processQueueItem(item);
                    await this.removeFromSyncQueue(item.id);
                    console.log('Synced item:', item.type, item.action);
                } catch (error) {
                    console.error('Failed to sync item:', item.id, error);

                    // Update retry count
                    if (item.retryCount < 3) {
                        await this.store(STORES.SYNC_QUEUE, {
                            ...item,
                            retryCount: item.retryCount + 1
                        });
                    } else {
                        console.error('Max retries reached for:', item.id);
                        // Keep in queue for manual resolution
                    }
                }
            }
        } finally {
            this.syncInProgress = false;
            console.log('Sync queue processing complete');
        }
    }

    private async processQueueItem(item: SyncQueueItem): Promise<void> {
        // This will be connected to Supabase operations
        const { supabase } = await import('@/integrations/supabase/client');

        switch (item.type) {
            case 'bill':
                if (item.action === 'create') {
                    const billData = item.data.bill;
                    const itemsData = item.data.items;

                    // Generate proper sequential bill number
                    const { data: allBillNos } = await supabase
                        .from('bills')
                        .select('bill_no')
                        .order('created_at', { ascending: false })
                        .limit(100);

                    let maxNumber = 55;
                    if (allBillNos && allBillNos.length > 0) {
                        allBillNos.forEach((bill: any) => {
                            const match = bill.bill_no.match(/^BILL-(\d{6})$/);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxNumber) {
                                    maxNumber = num;
                                }
                            }
                        });
                    }
                    const properBillNumber = `BILL-${String(maxNumber + 1).padStart(6, '0')}`;

                    // Update the bill data with proper bill number
                    const finalBillData = {
                        ...billData,
                        bill_no: properBillNumber
                    };

                    // Create the bill
                    const { data: createdBill, error: billError } = await supabase
                        .from('bills')
                        .insert(finalBillData)
                        .select()
                        .single();

                    if (billError) throw billError;

                    // Create bill items
                    if (createdBill && itemsData && itemsData.length > 0) {
                        const billItems = itemsData.map((billItem: any) => ({
                            bill_id: createdBill.id,
                            item_id: billItem.item_id,
                            quantity: billItem.quantity,
                            price: billItem.price,
                            total: billItem.total
                        }));

                        const { error: itemsError } = await supabase
                            .from('bill_items')
                            .insert(billItems);

                        if (itemsError) {
                            console.error('Failed to insert bill items, rolling back...', itemsError);
                            await supabase.from('bills').delete().eq('id', createdBill.id);
                            throw itemsError;
                        }
                    }

                    console.log(`Offline bill synced: ${billData.bill_no} → ${properBillNumber}`);
                }
                break;
            case 'expense':
                if (item.action === 'create') {
                    const { error } = await supabase.from('expenses').insert(item.data);
                    if (error) throw error;
                }
                break;
            default:
                console.warn('Unknown sync item type:', item.type);
        }
    }

    // Convenience methods for specific data types
    async cacheItems(items: any[]): Promise<void> {
        await this.storeMany(STORES.ITEMS, items);
    }

    async getCachedItems(): Promise<any[]> {
        return this.getAll(STORES.ITEMS);
    }

    async cacheCategories(categories: any[]): Promise<void> {
        await this.storeMany(STORES.CATEGORIES, categories);
    }

    async getCachedCategories(): Promise<any[]> {
        return this.getAll(STORES.CATEGORIES);
    }

    async cacheBill(bill: any): Promise<void> {
        await this.store(STORES.BILLS, { ...bill, synced: this.isOnline });
    }

    async getPendingBillsCount(): Promise<number> {
        const queue = await this.getSyncQueue();
        return queue.filter(item => item.type === 'bill').length;
    }
}

// Singleton instance
export const offlineManager = new OfflineManager();

// React hook for network status
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    React.useEffect(() => {
        const unsubscribe = offlineManager.onNetworkChange(setIsOnline);
        return unsubscribe;
    }, []);

    return isOnline;
}

// Need to import React for the hook
import * as React from 'react';
