import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, DollarSign, Monitor, Plus, Edit, Trash2, Printer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AddAdditionalChargeDialog } from '@/components/AddAdditionalChargeDialog';
import { EditAdditionalChargeDialog } from '@/components/EditAdditionalChargeDialog';
import { DisplaySettings } from '@/components/DisplaySettings';
import { PaymentTypesManagement } from '@/components/PaymentTypesManagement';
import { BluetoothPrinterSettings } from '@/components/BluetoothPrinterSettings';
import { ShopSettingsForm } from '@/components/ShopSettingsForm';
import { ThemeSettings } from '@/components/ThemeSettings';

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

  // Auto-print setting
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    const saved = localStorage.getItem('hotel_pos_auto_print');
    return saved !== null ? saved === 'true' : true; // Default to enabled
  });

  // Bill numbering setting - continue from yesterday (true) or start fresh daily (false)
  const [continueBillFromYesterday, setContinueBillFromYesterday] = useState(() => {
    const saved = localStorage.getItem('hotel_pos_continue_bill_number');
    return saved !== null ? saved === 'true' : true; // Default to continue from yesterday
  });

  const handleAutoPrintToggle = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    localStorage.setItem('hotel_pos_auto_print', String(enabled));
    toast({
      title: enabled ? "Auto-Print Enabled" : "Auto-Print Disabled",
      description: enabled ? "Bills will be printed automatically after saving." : "Bills will be saved without printing.",
    });
  };

  const handleBillNumberingToggle = (continueFromYesterday: boolean) => {
    setContinueBillFromYesterday(continueFromYesterday);
    localStorage.setItem('hotel_pos_continue_bill_number', String(continueFromYesterday));
    toast({
      title: continueFromYesterday ? "Continue Numbering" : "Fresh Daily Numbering",
      description: continueFromYesterday
        ? "Bill numbers will continue from where they left off yesterday."
        : "Bill numbers will start from 001 each day with date prefix (e.g., 12/01/26-001).",
    });
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdditionalCharges();
    } else if (profile) {
      // Non-admin user, stop loading
      setLoading(false);
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
    <div className="min-h-screen p-3 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <SettingsIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Settings</h1>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Shop Details */}
          <ShopSettingsForm />

          {/* Additional Charges Management */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-lg">Additional Charges</span>
                </div>
                <Button onClick={() => setChargeDialogOpen(true)} size="sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Add Charge
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {additionalCharges.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No Additional Charges</h3>
                  <p className="text-sm text-muted-foreground mb-3 sm:mb-4">Create your first additional charge to get started.</p>
                  <Button onClick={() => setChargeDialogOpen(true)} size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Add Charge
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  {additionalCharges.map((charge) => (
                    <Card key={charge.id} className="p-2 sm:p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <h3 className="font-semibold text-sm truncate">{charge.name}</h3>
                            <Badge variant={charge.is_active ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                              {charge.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {charge.is_default && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Default</Badge>
                            )}
                          </div>
                          {charge.description && (
                            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{charge.description}</p>
                          )}
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs">
                            <span className="font-medium">₹{charge.amount}</span>
                            <span className="text-muted-foreground text-[10px]">Type: {charge.charge_type}</span>
                            {charge.unit && (
                              <span className="text-muted-foreground text-[10px]">Unit: {charge.unit}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCharge(charge);
                              setEditChargeDialogOpen(true);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleChargeStatus(charge.id, charge.is_active)}
                            className="h-7 px-2 text-xs"
                          >
                            {charge.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCharge(charge.id)}
                            className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
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

          {/* Bluetooth Printer Settings */}
          <BluetoothPrinterSettings />

          {/* Print Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg">Print Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-print" className="text-sm font-medium">
                    Auto-Print on Bill Save
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {autoPrintEnabled
                      ? "Bill will be printed automatically when payment is completed."
                      : "Bill will be saved without printing. You can print later from Reports."}
                  </p>
                </div>
                <Switch
                  id="auto-print"
                  checked={autoPrintEnabled}
                  onCheckedChange={handleAutoPrintToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bill Numbering Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg">Bill Numbering</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bill-numbering" className="text-sm font-medium">
                    Continue Bill Numbers from Yesterday
                  </Label>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {continueBillFromYesterday
                      ? "Bill numbers continue sequentially (e.g., BILL-000082, 000083...)."
                      : "Bill numbers start fresh daily with date prefix (e.g., 12/01/26-001, 12/01/26-002...)."}
                  </p>
                </div>
                <Switch
                  id="bill-numbering"
                  checked={continueBillFromYesterday}
                  onCheckedChange={handleBillNumberingToggle}
                />
              </div>

              {/* Preview */}
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono">
                      {continueBillFromYesterday ? "BILL-000082" : `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '/')}-001`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Next bill number</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg">Display Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {profile?.user_id && <DisplaySettings userId={profile.user_id} />}
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <ThemeSettings />
        </div>
      </div>
    </div>
  );
};

export default Settings;
