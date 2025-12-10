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
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './SocialIcons';

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

  // Local settings state
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('58mm');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Social Media
  const [facebook, setFacebook] = useState('');
  const [showFacebook, setShowFacebook] = useState(true);
  const [instagram, setInstagram] = useState('');
  const [showInstagram, setShowInstagram] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [showWhatsapp, setShowWhatsapp] = useState(true);

  const deviceRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      loadFromLocalStorage(); // Instant load from cache
      fetchShopSettings();    // Background sync from Supabase
    }
  }, [profile?.user_id]);



  // Fetch Shop Settings from Supabase (background sync)
  const fetchShopSettings = async () => {
    if (!profile?.user_id) return;

    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching shop settings:', error);
        return; // Keep using cached data
      }

      if (data) {
        // Update from Supabase
        setShopName(data.shop_name || '');
        setAddress(data.address || '');
        setContactNumber(data.contact_number || '');
        setLogoUrl(data.logo_url || '');
        setPrinterWidth(data.printer_width as '58mm' | '80mm' || '58mm');
        setFacebook(data.facebook || '');
        setShowFacebook(data.show_facebook);
        setInstagram(data.instagram || '');
        setShowInstagram(data.show_instagram);
        setWhatsapp(data.whatsapp || '');
        setShowWhatsapp(data.show_whatsapp);
      }
    } catch (e) {
      console.error('Error in fetchShopSettings:', e);
      // Keep using cached data
    }
  };

  // Load from localStorage (instant cache)
  const loadFromLocalStorage = () => {
    const savedWidth = localStorage.getItem('hotel_pos_printer_width');
    if (savedWidth === '80mm') setPrinterWidth('80mm');

    const savedHeader = localStorage.getItem('hotel_pos_bill_header');
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        setShopName(parsed.shopName || '');
        setContactNumber(parsed.contactNumber || '');
        setAddress(parsed.address || '');
        setLogoUrl(parsed.logoUrl || '');
        if (parsed.printerWidth) setPrinterWidth(parsed.printerWidth);
        setFacebook(parsed.facebook || '');
        setShowFacebook(parsed.showFacebook !== false);
        setInstagram(parsed.instagram || '');
        setShowInstagram(parsed.showInstagram !== false);
        setWhatsapp(parsed.whatsapp || '');
        setShowWhatsapp(parsed.showWhatsapp !== false);
      } catch (e) {
        console.error("Failed to parse local bill header settings:", e);
        localStorage.removeItem('hotel_pos_bill_header');
      }
    }
  };

  const saveShopSettings = async () => {
    if (!profile?.user_id) {
      toast({ title: "Error", description: "You must be logged in to save settings.", variant: "destructive" });
      return;
    }

    try {
      const settingsData = {
        user_id: profile.user_id,
        shop_name: shopName || null,
        address: address || null,
        contact_number: contactNumber || null,
        logo_url: logoUrl || null,
        facebook: facebook || null,
        show_facebook: showFacebook,
        instagram: instagram || null,
        show_instagram: showInstagram,
        whatsapp: whatsapp || null,
        show_whatsapp: showWhatsapp,
        printer_width: printerWidth,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('shop_settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving to Supabase:', error);
        // Fallback to localStorage
        saveToLocalStorage();
        toast({
          title: "Settings Saved Locally",
          description: "Cloud sync failed. Settings saved to this device only.",
          variant: "destructive"
        });
        return;
      }

      // Also save to localStorage as backup
      saveToLocalStorage();

      toast({
        title: "Settings Saved",
        description: "Shop settings synced to cloud and available on all devices."
      });
    } catch (e) {
      console.error('Error in saveShopSettings:', e);
      saveToLocalStorage();
      toast({
        title: "Settings Saved Locally",
        description: "Cloud sync failed. Settings saved to this device only.",
        variant: "destructive"
      });
    }
  };

  // Helper to save to localStorage (backup)
  const saveToLocalStorage = () => {
    localStorage.setItem('hotel_pos_printer_width', printerWidth);
    localStorage.setItem('hotel_pos_bill_header', JSON.stringify({
      shopName,
      address,
      contactNumber,
      logoUrl,
      facebook,
      showFacebook,
      instagram,
      showInstagram,
      whatsapp,
      showWhatsapp,
      printerWidth
    }));
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
        description: "Bluetooth is not supported in this browser. Use Chrome or Edge on Android/Desktop.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      // Request Bluetooth device with common printer services
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Nordic UART Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Another common printer service
        ]
      });

      deviceRef.current = device;

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Try to find a writable characteristic
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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 1MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize image
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 384; // Standard thermal printer width in pixels
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to base64
          const dataUrl = canvas.toDataURL('image/png');
          setLogoUrl(dataUrl);
          toast({
            title: "Logo Processed",
            description: "Logo resized and ready for printing"
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

              {/* Shop Configuration Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Bill Header Configuration</h4>
                  <Button variant="ghost" size="sm" onClick={saveShopSettings} className="h-6 text-[10px] text-blue-600 hover:text-blue-700 px-2">
                    Save Changes
                  </Button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Shop Name</Label>
                      <Input
                        placeholder="My Hotel"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="h-9 text-sm bg-slate-50 dark:bg-slate-800 border-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Contact</Label>
                      <Input
                        placeholder="Phone Number"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="h-9 text-sm bg-slate-50 dark:bg-slate-800 border-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Address</Label>
                    <Input
                      placeholder="Shop Address, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-9 text-sm bg-slate-50 dark:bg-slate-800 border-none"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                    <Label className="text-xs text-slate-500 mb-2 block">Shop Logo</Label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="relative group w-16 h-16 bg-white border rounded-lg p-1 flex items-center justify-center">
                          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          <button
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-slate-50 dark:bg-slate-800/50 transition-colors">
                          <Upload className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="text-[9px] text-slate-400">Upload</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <select
                          className="w-full h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-xs px-3"
                          value={printerWidth}
                          onChange={(e) => setPrinterWidth(e.target.value as '58mm' | '80mm')}
                        >
                          <option value="58mm">58mm (2 inch) - Standard</option>
                          <option value="80mm">80mm (3 inch) - Wide</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">Select your paper roll width</p>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Upload className="w-3 h-3 mr-2" />
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Max 1MB. Resized to 384px for printing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={saveShopSettings} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl h-10 shadow-lg">
                Save & Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  return <PrinterStatusCard />;
};
