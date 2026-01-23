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
