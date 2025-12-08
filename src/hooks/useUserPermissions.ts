import { useState, useEffect } from 'react';
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

export const useUserPermissions = () => {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_id) {
      fetchPermissions();
    }
  }, [profile?.user_id]);

  const fetchPermissions = async () => {
    try {
      // Admins have all permissions by default
      if (profile?.role === 'admin') {
        setPermissions({
          dashboard: true,
          billing: true,
          items: true,
          expenses: true,
          reports: true,
          analytics: true,
          settings: true,
          users: true,
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .select('page_name, has_access')
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      const perms = { ...DEFAULT_PERMISSIONS };
      (data || []).forEach((perm: { page_name: string; has_access: boolean }) => {
        if (perm.page_name in perms) {
          (perms as any)[perm.page_name] = perm.has_access;
        }
      });

      setPermissions(perms);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (page: keyof UserPermissions): boolean => {
    // Admins always have access
    if (profile?.role === 'admin') return true;
    return permissions[page];
  };

  return { permissions, loading, hasAccess };
};
