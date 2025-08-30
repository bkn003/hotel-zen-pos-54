
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Users as UsersIcon, Search, Crown, User, Shield } from 'lucide-react';
import { AddUserDialog } from '@/components/AddUserDialog';
import { PaymentTypesManagement } from '@/components/PaymentTypesManagement';
import type { UserProfile } from '@/types/user';

const Users: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower) ||
          user.hotel_name?.toLowerCase().includes(searchLower) ||
          user.status.toLowerCase().includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the data to ensure proper typing
      const typedUsers = (data || []).map(user => ({
        ...user,
        status: user.status as 'active' | 'paused' | 'deleted'
      }));
      
      setUsers(typedUsers);
      setFilteredUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User status updated successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <UsersIcon className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Users Management</h1>
            <p className="text-muted-foreground text-sm">Manage system users and settings</p>
          </div>
        </div>
        {profile?.role === 'super_admin' && (
          <AddUserDialog onUserAdded={fetchUsers} />
        )}
      </div>

      {/* Payment Types Management */}
      {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
        <PaymentTypesManagement />
      )}

      {/* Search Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Search Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, role, hotel, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <UsersIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No users match your search criteria.' : 'No users available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-base">{user.name}</h4>
                        {user.hotel_name && (
                          <p className="text-sm text-muted-foreground">{user.hotel_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        <Badge 
                          variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <Badge 
                      variant={user.status === 'active' ? 'default' : user.status === 'paused' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {user.status}
                    </Badge>
                    
                    <div className="text-xs text-muted-foreground">
                      <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                      <div>Updated: {new Date(user.updated_at).toLocaleDateString()}</div>
                    </div>
                    
                    {profile?.role === 'super_admin' && user.role !== 'super_admin' && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'paused' : 'active')}
                          className="text-xs flex-1 sm:flex-none"
                        >
                          {user.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                        {user.status !== 'deleted' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateUserStatus(user.id, 'deleted')}
                            className="text-xs flex-1 sm:flex-none"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
