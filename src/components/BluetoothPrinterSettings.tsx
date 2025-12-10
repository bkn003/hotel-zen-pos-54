import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Printer, Bluetooth, AlertCircle, CheckCircle2, RefreshCw, FileText, Zap, Upload, Image as ImageIcon, X } from 'lucide-react';


// Local storage key for device persistence
const BLUETOOTH_DEVICE_KEY = 'hotel_pos_bluetooth_printer';

interface BluetoothSettings {
  id?: string;
  is_enabled: boolean;
  printer_name: string | null;
  auto_print: boolean;
}

interface SavedDevice {
  name: string;
  lastConnected: number;
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
  const [printing, setPrinting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor' | null>(null);



  const deviceRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);

  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

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

  useEffect(() => {
    if (profile?.user_id) {
      fetchSettings();
      // Load from cache first, then sync from Supabase

    }
  }, [profile?.user_id]);








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
        description: "Bluetooth is not supported in this browser. Use Chrome or Edge on Android/Desktop.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ]
      });

      deviceRef.current = device;

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristicRef.current = char;
            break;
          }
        }
        if (characteristicRef.current) break;
      }

      await updateSettings({
        printer_name: device.name || 'Bluetooth Printer',
        is_enabled: true
      });

      toast({
        title: "Connected!",
        description: `Successfully connected to ${device.name || 'Bluetooth Printer'}`,
      });
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        console.error('Bluetooth error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to printer. Make sure the printer is on and paired.",
          variant: "destructive",
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectPrinter = () => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    characteristicRef.current = null;
    updateSettings({ printer_name: null, is_enabled: false });
  };

  const printTestPage = async () => {
    if (!settings.is_enabled || !settings.printer_name) {
      toast({
        title: "No Printer",
        description: "Please connect a printer first",
        variant: "destructive",
      });
      return;
    }

    setPrinting(true);
    try {
      // Reconnect if needed
      if (!deviceRef.current?.gatt?.connected) {
        const nav = navigator as any;
        const device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const server = await device.gatt?.connect();
        const services = await server?.getPrimaryServices();
        for (const service of services || []) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristicRef.current = char;
              break;
            }
          }
          if (characteristicRef.current) break;
        }
      }

      if (!characteristicRef.current) {
        throw new Error('No writable characteristic found');
      }

      // ESC/POS test print commands
      const encoder = new TextEncoder();
      const ESC = 0x1B;
      const GS = 0x1D;

      // Initialize printer
      const init = new Uint8Array([ESC, 0x40]);
      await characteristicRef.current.writeValue(init);

      // Center align
      const center = new Uint8Array([ESC, 0x61, 0x01]);
      await characteristicRef.current.writeValue(center);

      // Bold on
      const boldOn = new Uint8Array([ESC, 0x45, 0x01]);
      await characteristicRef.current.writeValue(boldOn);

      // Print header
      const header = encoder.encode('=== TEST PRINT ===\n');
      await characteristicRef.current.writeValue(header);

      // Bold off
      const boldOff = new Uint8Array([ESC, 0x45, 0x00]);
      await characteristicRef.current.writeValue(boldOff);

      // Left align
      const left = new Uint8Array([ESC, 0x61, 0x00]);
      await characteristicRef.current.writeValue(left);

      // Print details
      const details = encoder.encode(`\nPrinter: ${settings.printer_name}\nDate: ${new Date().toLocaleString()}\n\nConnection successful!\nPrinter is ready to use.\n\n`);
      await characteristicRef.current.writeValue(details);

      // Center and print footer
      await characteristicRef.current.writeValue(center);
      const footer = encoder.encode('================\n\n\n');
      await characteristicRef.current.writeValue(footer);

      // Cut paper (if supported)
      const cut = new Uint8Array([GS, 0x56, 0x00]);
      await characteristicRef.current.writeValue(cut);

      toast({
        title: "Test Print Sent!",
        description: "Check your printer for the test page",
      });
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: error.message || "Failed to print test page. Try reconnecting the printer.",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const PrinterStatusCard = () => (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-none shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-full ${settings.is_enabled && settings.printer_name ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/30' : 'bg-slate-200/50 text-slate-500 dark:bg-slate-800'}`}>
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Bluetooth Printer</h3>
            <p className="text-xs text-muted-foreground">
              {settings.is_enabled && settings.printer_name
                ? <span className="text-green-600 flex items-center gap-1">● Connected to {settings.printer_name}</span>
                : "Not connected"}
            </p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-full px-4 border-slate-300 dark:border-slate-700">
              {settings.is_enabled ? 'Settings' : 'Pair Device'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl gap-0 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <DialogHeader className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-10">
              <DialogTitle className="text-base font-medium flex items-center gap-2">
                <Bluetooth className="w-5 h-5 text-blue-500" />
                Device Settings
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 overflow-y-auto max-h-[80vh] space-y-6">
              {/* Connection Status Section */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wider">Connection Status</h4>
                {settings.printer_name ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{settings.printer_name}</div>
                        <div className="text-xs text-green-600 font-medium">Connected</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={disconnectPrinter} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3 text-xs">
                      Unpair
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bluetooth className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No device paired</p>
                    <p className="text-xs text-slate-500 mb-4 max-w-[200px] mx-auto">Make sure your printer is turned on and in pairing mode.</p>
                    <Button
                      onClick={connectPrinter}
                      disabled={connecting || !isBluetoothSupported}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-none rounded-xl"
                    >
                      {connecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          Pair New Device
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Printer Settings Section */}
              {settings.printer_name && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 px-1 tracking-wider">Preferences</h4>
                  <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="p-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Enable Printing</p>
                          <p className="text-[10px] text-slate-500">Allow printing receipts</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.is_enabled}
                        onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                      />
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto Print</p>
                          <p className="text-[10px] text-slate-500">Print automatically after sale</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.auto_print}
                        onCheckedChange={(checked) => updateSettings({ auto_print: checked })}
                        disabled={!settings.is_enabled}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={printTestPage}
                    disabled={printing || !settings.is_enabled}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900"
                  >
                    {printing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Printing Test Page...
                      </>
                    ) : (
                      "Print Test Page"
                    )}
                  </Button>
                </div>
              )}

              {/* Shop Configuration Moved to Main Settings Page */}
            </div>


          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  return <PrinterStatusCard />;
};
