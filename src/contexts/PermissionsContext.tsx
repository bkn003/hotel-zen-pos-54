import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPermissions {
    dashboard: boolean;
    billing: boolean;
    items: boolean;
    expenses: boolean;
    reports: boolean;
    analytics: boolean;
    settings: boolean;
    users: boolean;
    serviceArea: boolean;
    kitchen: boolean;
    customerDisplay: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
    dashboard: false,
    billing: false,
    items: false,
    expenses: false,
    reports: false,
    analytics: false,
    settings: false,
    users: false,
    serviceArea: false,
    kitchen: false,
    customerDisplay: false,
};

const ADMIN_PERMISSIONS: UserPermissions = {
    dashboard: true,
    billing: true,
    items: true,
    expenses: true,
    reports: true,
    analytics: true,
    settings: true,
    users: true,
    serviceArea: true,
    kitchen: true,
    customerDisplay: true,
};

interface PermissionsContextType {
    permissions: UserPermissions;
    loading: boolean;
    hasAccess: (page: keyof UserPermissions) => boolean;
    refetch: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { profile, loading: authLoading } = useAuth();
    const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);
    const fetchedForUserRef = useRef<string | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (authLoading) return;

        if (!profile?.user_id) {
            setPermissions(DEFAULT_PERMISSIONS);
            setLoading(false);
            return;
        }

        // Admins get all permissions
        if (profile.role === 'admin' || profile.role === 'super_admin') {
            setPermissions(ADMIN_PERMISSIONS);
            setLoading(false);
            fetchedForUserRef.current = profile.user_id;
            return;
        }

        // Already fetched for this user
        if (fetchedForUserRef.current === profile.user_id) {
            return;
        }

        try {
            // Use RPC function which uses auth.uid() directly in database
            const { data, error } = await supabase.rpc('get_my_permissions');

            if (error) {
                // Fallback: try direct query
                const { data: directData, error: directError } = await supabase
                    .from('user_permissions')
                    .select('page_name, has_access')
                    .eq('user_id', profile.user_id);

                if (directError || !directData) {
                    setPermissions(DEFAULT_PERMISSIONS);
                    setLoading(false);
                    return;
                }

                const perms = { ...DEFAULT_PERMISSIONS };
                for (const row of directData) {
                    if (row.page_name in perms) {
                        (perms as any)[row.page_name] = row.has_access === true;
                    }
                }
                setPermissions(perms);
                fetchedForUserRef.current = profile.user_id;
                setLoading(false);
                return;
            }

            // Build permissions from RPC result
            const perms = { ...DEFAULT_PERMISSIONS };

            if (data && Array.isArray(data)) {
                for (const row of data) {
                    if (row.page_name in perms) {
                        (perms as any)[row.page_name] = row.has_access === true;
                    }
                }
            }

            setPermissions(perms);
            fetchedForUserRef.current = profile.user_id;
            setLoading(false);
        } catch (err) {
            console.error('[Permissions] Error:', err);
            setPermissions(DEFAULT_PERMISSIONS);
            setLoading(false);
        }
    }, [profile?.user_id, profile?.role, authLoading]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    useEffect(() => {
        if (profile?.user_id && profile.user_id !== fetchedForUserRef.current) {
            setLoading(true);
            fetchedForUserRef.current = null;
        }
    }, [profile?.user_id]);

    // === REALTIME SUBSCRIPTION FOR INSTANT PERMISSION UPDATES ===
    useEffect(() => {
        if (!profile?.user_id || profile.role === 'admin' || profile.role === 'super_admin') {
            return;
        }

        console.log('[Permissions] Setting up realtime subscription for user:', profile.user_id);

        const channel = supabase
            .channel(`permissions-${profile.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'user_permissions',
                    filter: `user_id=eq.${profile.user_id}`
                },
                (payload) => {
                    console.log('[Permissions] Realtime update received:', payload);

                    const { eventType, new: newRow, old: oldRow } = payload;

                    if (eventType === 'UPDATE' || eventType === 'INSERT') {
                        const row = newRow as any;
                        if (row.page_name) {
                            setPermissions(prev => {
                                const updated = { ...prev };
                                if (row.page_name in updated) {
                                    console.log(`[Permissions] Page ${row.page_name} access changed to:`, row.has_access);
                                    (updated as any)[row.page_name] = row.has_access === true;

                                    // If access was revoked, check if user is on that page and redirect
                                    if (row.has_access === false) {
                                        const pageToRoute: Record<string, string> = {
                                            dashboard: '/dashboard',
                                            billing: '/billing',
                                            items: '/items',
                                            expenses: '/expenses',
                                            reports: '/reports',
                                            analytics: '/analytics',
                                            settings: '/settings',
                                            users: '/users',
                                            serviceArea: '/service-area',
                                            kitchen: '/kitchen',
                                            customerDisplay: '/customer-display'
                                        };

                                        const currentPath = window.location.pathname;
                                        const blockedPath = pageToRoute[row.page_name];

                                        if (blockedPath && currentPath === blockedPath) {
                                            console.log('[Permissions] User on blocked page, redirecting...');
                                            // Find first allowed page to redirect to
                                            const firstAllowedPage = Object.entries(updated).find(([_, allowed]) => allowed);
                                            if (firstAllowedPage) {
                                                const redirectPath = pageToRoute[firstAllowedPage[0]] || '/';
                                                window.location.href = redirectPath;
                                            } else {
                                                // No pages allowed, redirect to auth
                                                window.location.href = '/auth';
                                            }
                                        }
                                    }
                                }
                                return updated;
                            });
                        }
                    } else if (eventType === 'DELETE') {
                        const row = oldRow as any;
                        if (row.page_name) {
                            console.log(`[Permissions] Page ${row.page_name} permission deleted`);
                            setPermissions(prev => {
                                const updated = { ...prev };
                                if (row.page_name in updated) {
                                    (updated as any)[row.page_name] = false;
                                }
                                return updated;
                            });
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('[Permissions] Subscription status:', status);
            });

        return () => {
            console.log('[Permissions] Cleaning up realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [profile?.user_id, profile?.role]);

    const hasAccess = useCallback((page: keyof UserPermissions): boolean => {
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            return true;
        }
        return permissions[page] === true;
    }, [profile?.role, permissions]);

    const refetch = useCallback(() => {
        fetchedForUserRef.current = null;
        setLoading(true);
        fetchPermissions();
    }, [fetchPermissions]);

    return (
        <PermissionsContext.Provider value={{ permissions, loading, hasAccess, refetch }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = (): PermissionsContextType => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
};

export const useUserPermissions = (): PermissionsContextType => {
    return usePermissions();
};
