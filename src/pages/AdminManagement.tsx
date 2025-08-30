import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Crown, CheckCircle, XCircle, Trash2, Clock } from 'lucide-react';
import { UserStatus } from '@/types/user';

interface AdminProfile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  hotel_name?: string;
  status: UserStatus;
  created_at: string;
}

const AdminManagement = () => {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to ensure all required fields are present
      const adminProfiles: AdminProfile[] = (data || []).map((admin: any) => ({
        id: admin.id,
        user_id: admin.user_id,
        name: admin.name || 'Unknown',
        role: admin.role || 'admin',
        hotel_name: admin.hotel_name || undefined,
        status: (admin.status || 'paused') as UserStatus,
        created_at: admin.created_at
      }));
      
      setAdmins(adminProfiles);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAdminStatus = async (adminId: string, newStatus: UserStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', adminId);

      if (error) throw error;

      // If deleting, clean up related data using the database function
      if (newStatus === 'deleted') {
        const admin = admins.find(a => a.id === adminId);
        if (admin) {
          try {
            const { error: rpcError } = await supabase
              .rpc('delete_user_and_data', { uid: admin.user_id });
            if (rpcError) {
              console.error('Error calling delete_user_and_data:', rpcError);
            }
          } catch (rpcError) {
            console.error('Error calling delete_user_and_data:', rpcError);
            // Continue with the status update even if deletion fails
          }
        }
      }

      await fetchAdmins();
      
      toast({
        title: "Success",
        description: `Admin account ${newStatus === 'active' ? 'activated' : newStatus === 'paused' ? 'paused' : 'deleted'} successfully`,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  // Only allow access to admins (removed super_admin check)
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page. Only Admins can manage admin accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin accounts...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'deleted': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Clock className="w-4 h-4" />;
      case 'deleted': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Crown className="w-8 h-8 text-primary mr-3" />
          <div>
            <h1 className="text-3xl font-bold">Admin Management</h1>
            <p className="text-muted-foreground">Manage hotel admin accounts and permissions</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {admins.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Admin Accounts</h3>
              <p className="text-muted-foreground">
                No hotel admin accounts have been registered yet. Admins will appear here after they sign up.
              </p>
            </CardContent>
          </Card>
        ) : (
          admins.map((admin) => (
            <Card key={admin.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{admin.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{admin.hotel_name}</p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(admin.status)} flex items-center gap-1`}>
                    {getStatusIcon(admin.status)}
                    {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>Registered: {new Date(admin.created_at).toLocaleDateString()}</p>
                    <p>Role: Admin</p>
                  </div>
                  <div className="flex gap-2">
                    {admin.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => updateAdminStatus(admin.id, 'active')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    {admin.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAdminStatus(admin.id, 'paused')}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    {admin.status !== 'deleted' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the admin account for "{admin.name}" and all associated data including:
                              <br />• All bills and transactions
                              <br />• All expenses records  
                              <br />• All items and categories
                              <br />• All staff user accounts
                              <br /><br />
                              This action cannot be undone. Are you sure you want to proceed?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateAdminStatus(admin.id, 'deleted')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminManagement;
