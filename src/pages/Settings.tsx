import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, DollarSign, Monitor, Plus, X, Edit, Trash2 } from 'lucide-react';
import { AddAdditionalChargeDialog } from '@/components/AddAdditionalChargeDialog';
import { EditAdditionalChargeDialog } from '@/components/EditAdditionalChargeDialog';
import { DisplaySettings } from '@/components/DisplaySettings';
import { PaymentTypesManagement } from '@/components/PaymentTypesManagement';

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
  description?: string;
  charge_type: string;
  unit?: string;
  is_active: boolean;
  is_default: boolean;
}

const Settings = () => {
  const { profile } = useAuth();
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [editChargeDialogOpen, setEditChargeDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<AdditionalCharge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdditionalCharges();
    }
  }, [profile]);

  const fetchAdditionalCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('additional_charges')
        .select('*')
        .order('name');

      if (error) throw error;
      setAdditionalCharges(data || []);
    } catch (error) {
      console.error('Error fetching additional charges:', error);
      toast({
        title: "Error",
        description: "Failed to fetch additional charges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChargeStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('additional_charges')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Charge ${!isActive ? 'activated' : 'deactivated'} successfully`
      });

      fetchAdditionalCharges();
    } catch (error) {
      console.error('Error updating charge status:', error);
      toast({
        title: "Error",
        description: "Failed to update charge status",
        variant: "destructive"
      });
    }
  };

  const deleteCharge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('additional_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Charge deleted successfully"
      });

      fetchAdditionalCharges();
    } catch (error) {
      console.error('Error deleting charge:', error);
      toast({
        title: "Error",
        description: "Failed to delete charge",
        variant: "destructive"
      });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Additional Charges Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Additional Charges Management</span>
                </div>
                <Button onClick={() => setChargeDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Charge
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {additionalCharges.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Additional Charges</h3>
                  <p className="text-muted-foreground mb-4">Create your first additional charge to get started.</p>
                  <Button onClick={() => setChargeDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Charge
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {additionalCharges.map((charge) => (
                    <Card key={charge.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{charge.name}</h3>
                            <Badge variant={charge.is_active ? "default" : "secondary"}>
                              {charge.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {charge.is_default && (
                              <Badge variant="outline">Default</Badge>
                            )}
                          </div>
                          {charge.description && (
                            <p className="text-sm text-muted-foreground mb-2">{charge.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="font-medium">₹{charge.amount}</span>
                            <span className="text-muted-foreground">Type: {charge.charge_type}</span>
                            {charge.unit && (
                              <span className="text-muted-foreground">Unit: {charge.unit}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCharge(charge);
                              setEditChargeDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleChargeStatus(charge.id, charge.is_active)}
                          >
                            {charge.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCharge(charge.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              <AddAdditionalChargeDialog
                open={chargeDialogOpen}
                onOpenChange={setChargeDialogOpen}
                onSuccess={() => {
                  setChargeDialogOpen(false);
                  fetchAdditionalCharges();
                  toast({
                    title: "Success",
                    description: "Additional charge added successfully"
                  });
                }}
              />
              
              <EditAdditionalChargeDialog
                open={editChargeDialogOpen}
                onOpenChange={setEditChargeDialogOpen}
                charge={editingCharge}
                onSuccess={() => {
                  setEditChargeDialogOpen(false);
                  setEditingCharge(null);
                  fetchAdditionalCharges();
                }}
              />
            </CardContent>
          </Card>

          {/* Payment Types Management */}
          <PaymentTypesManagement />

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>Display Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.user_id && <DisplaySettings userId={profile.user_id} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;