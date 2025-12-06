import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import type { UserProfile } from '@/types/user';

interface UserPermission {
  id: string;
  user_id: string;
  page_name: string;
  has_access: boolean;
}

const AVAILABLE_PAGES = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'billing', label: 'Billing' },
  { name: 'items', label: 'Items' },
  { name: 'expenses', label: 'Expenses' },
  { name: 'reports', label: 'Reports' },
  { name: 'analytics', label: 'Analytics' },
  { name: 'settings', label: 'Settings' },
];

interface UserPermissionsProps {
  users: UserProfile[];
}

export const UserPermissions: React.FC<UserPermissionsProps> = ({ users }) => {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, [users]);

  const fetchPermissions = async () => {
    try {
      const userIds = users.map(u => u.user_id);
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      // Build permissions map
      const permMap: Record<string, Record<string, boolean>> = {};
      
      users.forEach(user => {
        permMap[user.user_id] = {};
        AVAILABLE_PAGES.forEach(page => {
          // Default: admins have all access, users have none
          permMap[user.user_id][page.name] = user.role === 'admin';
        });
      });

      // Override with actual permissions from DB
      (data || []).forEach((perm: UserPermission) => {
        if (permMap[perm.user_id]) {
          permMap[perm.user_id][perm.page_name] = perm.has_access;
        }
      });

      setPermissions(permMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (userId: string, pageName: string, currentValue: boolean) => {
    try {
      // Update local state immediately for better UX
      setPermissions(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [pageName]: !currentValue
        }
      }));

      // Upsert the permission
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          page_name: pageName,
          has_access: !currentValue
        }, {
          onConflict: 'user_id,page_name'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      // Revert on error
      setPermissions(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [pageName]: currentValue
        }
      }));
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5" />
          User Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">USER</th>
                {AVAILABLE_PAGES.map(page => (
                  <th key={page.name} className="text-center py-3 px-2 font-medium text-muted-foreground uppercase text-xs">
                    {page.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <div className="font-medium text-primary">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.hotel_name}</div>
                    <div className="text-xs text-primary/70 capitalize">{user.role}</div>
                  </td>
                  {AVAILABLE_PAGES.map(page => (
                    <td key={page.name} className="text-center py-3 px-2">
                      <Switch
                        checked={permissions[user.user_id]?.[page.name] ?? false}
                        onCheckedChange={() => togglePermission(
                          user.user_id, 
                          page.name, 
                          permissions[user.user_id]?.[page.name] ?? false
                        )}
                        className="data-[state=checked]:bg-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No users available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
