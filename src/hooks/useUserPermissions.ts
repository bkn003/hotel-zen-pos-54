import { useState, useEffect, useCallback } from 'react';
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
};

// All permissions granted for admins
const ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: true,
  billing: true,
  items: true,
  expenses: true,
  reports: true,
  analytics: true,
  settings: true,
  users: true,
};

// Cache key prefix and TTL (2 minutes - short so admin changes take effect quickly)
const PERMISSIONS_CACHE_KEY = 'hotel_pos_permissions_';
const PERMISSIONS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (was 1 hour)

interface CachedPermissions {
  permissions: UserPermissions;
  timestamp: number;
}

// Get cached permissions from localStorage
const getCachedPermissions = (userId: string): UserPermissions | null => {
  try {
    const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY + userId);
    if (!cached) return null;

    const parsed: CachedPermissions = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - parsed.timestamp > PERMISSIONS_CACHE_TTL) {
      localStorage.removeItem(PERMISSIONS_CACHE_KEY + userId);
      return null;
    }

    return parsed.permissions;
  } catch {
    return null;
  }
};

// Save permissions to localStorage
const cachePermissions = (userId: string, permissions: UserPermissions): void => {
  try {
    const data: CachedPermissions = {
      permissions,
      timestamp: Date.now()
    };
    localStorage.setItem(PERMISSIONS_CACHE_KEY + userId, JSON.stringify(data));
  } catch (e) {
    console.warn('[Permissions] Failed to cache:', e);
  }
};

export const useUserPermissions = () => {
  const { profile, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    // If no profile, set loading false and return defaults
    if (!profile?.user_id) {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    // Admins have all permissions by default
    if (profile.role === 'admin') {
      setPermissions(ADMIN_PERMISSIONS);
      setLoading(false);
      return;
    }

    // Check localStorage cache first (skip if forceRefresh)
    if (!forceRefresh) {
      const cached = getCachedPermissions(profile.user_id);
      if (cached) {
        console.log('[Permissions] Using cached permissions');
        setPermissions(cached);
        setLoading(false);
        return;
      }
    }

    // Non-admin: fetch permissions from database
    try {
      console.log('[Permissions] Fetching from Supabase...');

      const { data, error } = await supabase
        .from('user_permissions')
        .select('page_name, has_access')
        .eq('user_id', profile.user_id);

      if (error) {
        throw error;
      }

      // Start with defaults (all false) and apply granted permissions
      const perms = { ...DEFAULT_PERMISSIONS };

      (data || []).forEach((perm: { page_name: string; has_access: boolean }) => {
        if (perm.page_name in perms) {
          (perms as any)[perm.page_name] = perm.has_access;
        }
      });

      // Cache the permissions
      cachePermissions(profile.user_id, perms);

      setPermissions(perms);
    } catch (error) {
      console.error('[Permissions] Error:', error);
      // Try to use cached on error
      const cached = getCachedPermissions(profile.user_id);
      if (cached) {
        setPermissions(cached);
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, profile?.role, authLoading]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback((page: keyof UserPermissions): boolean => {
    // Admins always have access
    if (profile?.role === 'admin') return true;
    return permissions[page];
  }, [profile?.role, permissions]);

  // Force refresh permissions (clears cache)
  const refreshPermissions = useCallback(() => {
    if (profile?.user_id) {
      localStorage.removeItem(PERMISSIONS_CACHE_KEY + profile.user_id);
    }
    fetchPermissions(true);
  }, [profile?.user_id, fetchPermissions]);

  return { permissions, loading, hasAccess, refetch: refreshPermissions };
};
