import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Printer, Bluetooth, AlertCircle } from 'lucide-react';

interface BluetoothSettings {
  id?: string;
  is_enabled: boolean;
  printer_name: string | null;
  auto_print: boolean;
}

export const BluetoothPrinterSettings: React.FC = () => {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<BluetoothSettings>({
    is_enabled: false,
    printer_name: null,
    auto_print: false
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchSettings();
    }
  }, [profile?.user_id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bluetooth_settings')
        .select('*')
        .eq('user_id', profile?.user_id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          is_enabled: data.is_enabled,
          printer_name: data.printer_name,
          auto_print: data.auto_print
        });
      }
    } catch (error) {
      console.error('Error fetching bluetooth settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<BluetoothSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);

      if (settings.id) {
        const { error } = await supabase
          .from('bluetooth_settings')
          .update({
            is_enabled: newSettings.is_enabled,
            printer_name: newSettings.printer_name,
            auto_print: newSettings.auto_print
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('bluetooth_settings')
          .insert({
            user_id: profile?.user_id,
            is_enabled: newSettings.is_enabled,
            printer_name: newSettings.printer_name,
            auto_print: newSettings.auto_print
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const connectPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      toast({
        title: "Not Supported",
        description: "Bluetooth is not supported in this browser. Use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      await updateSettings({ 
        printer_name: device.name || 'Unknown Printer',
        is_enabled: true 
      });

      toast({
        title: "Connected",
        description: `Connected to ${device.name || 'Bluetooth Printer'}`,
      });
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to printer",
          variant: "destructive",
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectPrinter = () => {
    updateSettings({ printer_name: null, is_enabled: false });
  };

  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

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
          <Printer className="w-5 h-5" />
          Bluetooth Printer Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect a 2-inch Bluetooth thermal printer for automatic receipt printing after each sale. 
          Requires Chrome or Edge browser on desktop or Android.
        </p>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="font-medium">Enable Bluetooth Printing</div>
            <div className="text-sm text-muted-foreground">
              Automatically print receipts after completing sales
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={settings.is_enabled ? "default" : "secondary"}>
              {settings.is_enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
            />
          </div>
        </div>

        {/* Printer Connection */}
        <div className="space-y-3">
          {settings.printer_name ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">{settings.printer_name}</div>
                  <div className="text-xs text-green-600">Connected</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectPrinter}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={connectPrinter} 
              disabled={connecting || !isBluetoothSupported}
              className="w-full"
            >
              <Bluetooth className="w-4 h-4 mr-2" />
              {connecting ? 'Connecting...' : 'Connect Bluetooth Printer'}
            </Button>
          )}
        </div>

        {/* Auto Print Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="font-medium">Auto Print on Sale</div>
            <div className="text-sm text-muted-foreground">
              Print receipt automatically when payment is completed
            </div>
          </div>
          <Switch
            checked={settings.auto_print}
            onCheckedChange={(checked) => updateSettings({ auto_print: checked })}
            disabled={!settings.is_enabled}
          />
        </div>

        {/* Important Notes */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-1">Important Notes:</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Works with ESC/POS compatible thermal printers</li>
                <li>Requires Chrome or Edge browser (not Safari)</li>
                <li>Android and desktop supported (iOS not supported)</li>
                <li>Printer must be paired in device Bluetooth settings first</li>
                <li>If printing fails, sale will still be saved</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
