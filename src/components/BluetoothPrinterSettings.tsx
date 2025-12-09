import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          Bluetooth Printer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {!isBluetoothSupported && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                Bluetooth not supported. Use Chrome or Edge on Android/Desktop.
              </span>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          {settings.printer_name ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-base">{settings.printer_name}</div>
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Connected
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectPrinter} className="text-red-600 border-red-300 hover:bg-red-50">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <Bluetooth className="w-10 h-10 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-muted-foreground mb-3">No printer connected</p>
              <Button
                onClick={connectPrinter}
                disabled={connecting || !isBluetoothSupported}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 mr-2" />
                    Connect Printer
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        {settings.printer_name && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <div className="font-medium text-sm">Enable Printing</div>
                <div className="text-xs text-muted-foreground">
                  Allow bills to be printed
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.is_enabled ? "default" : "secondary"} className="text-xs">
                  {settings.is_enabled ? "On" : "Off"}
                </Badge>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <div className="font-medium text-sm">Auto Print</div>
                <div className="text-xs text-muted-foreground">
                  Print receipt after each sale
                </div>
              </div>
              <Switch
                checked={settings.auto_print}
                onCheckedChange={(checked) => updateSettings({ auto_print: checked })}
                disabled={!settings.is_enabled}
              />
            </div>



            <Button
              onClick={printTestPage}
              disabled={printing || !settings.is_enabled}
              variant="outline"
              className="w-full"
            >
              {printing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Print Test Page
                </>
              )}
            </Button>
          </>
        )}

        {/* Printer Configuration (Local) - Moved outside so it's always visible */}
        <div className="space-y-4 pt-2 border-t">
          <h3 className="font-semibold text-sm">Shop Details & Printer Settings</h3>

          <div className="grid gap-4">
            <div className="space-y-3">
              <Label>Bill Header Details</Label>
              <p className="text-xs text-muted-foreground mb-2">Configure how your bill header looks.</p>

              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Shop Name</Label>
                  <Input
                    placeholder="e.g. My Hotel"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Address</Label>
                  <Input
                    placeholder="Shop Address (e.g. 123 Main St, City)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Contact Number</Label>
                  <Input
                    placeholder="Phone Number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>

                {/* Social Media Section */}
                <div className="space-y-4 pt-2 border-t border-dashed">
                  <Label className="text-xs font-semibold text-primary">Social Media Links</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">Enable to show on digital and printed bills.</p>

                  <div className="grid gap-3">
                    {/* Facebook */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Facebook</Label>
                        <Switch
                          checked={showFacebook}
                          onCheckedChange={setShowFacebook}
                          className="scale-75"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1877F2]">
                          <FacebookIcon className="w-5 h-5" />
                        </div>
                        <Input
                          placeholder="username"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          className="h-9 text-xs pl-10"
                          disabled={!showFacebook}
                        />
                      </div>
                    </div>

                    {/* Instagram */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Instagram</Label>
                        <Switch
                          checked={showInstagram}
                          onCheckedChange={setShowInstagram}
                          className="scale-75"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#E4405F]">
                          <InstagramIcon className="w-5 h-5" />
                        </div>
                        <Input
                          placeholder="username"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="h-9 text-xs pl-10"
                          disabled={!showInstagram}
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">WhatsApp</Label>
                        <Switch
                          checked={showWhatsapp}
                          onCheckedChange={setShowWhatsapp}
                          className="scale-75"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#25D366]">
                          <WhatsAppIcon className="w-5 h-5" />
                        </div>
                        <Input
                          placeholder="number"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="h-9 text-xs pl-10"
                          disabled={!showWhatsapp}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Shop Logo</Label>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="relative group">
                        <div className="w-16 h-16 border rounded-lg overflow-hidden bg-white">
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <button
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
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

            <div>
              <Label htmlFor="width">Printer Paper Width</Label>
              <Select value={printerWidth} onValueChange={(val: '58mm' | '80mm') => setPrinterWidth(val)}>
                <SelectTrigger id="width">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Standard Thermal)</SelectItem>
                  <SelectItem value="80mm">80mm (Wide Thermal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={saveShopSettings} size="sm" variant="secondary">
              Save Cloud Settings
            </Button>
          </div>
        </div>

        {/* Help */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <div className="font-medium mb-1">Setup Tips:</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Pair printer in device Bluetooth settings first</li>
                <li>Use Chrome or Edge browser</li>
                <li>Works on Android and desktop (not iOS/Safari)</li>
                <li>Compatible with ESC/POS thermal printers</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
