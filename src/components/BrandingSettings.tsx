import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Palette, Sparkles, Eye } from 'lucide-react';

const presetColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Green', value: '#10b981' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Navy', value: '#1e3a8a' },
  { name: 'Pink', value: '#c11c84' },
  { name: 'Teal', value: '#14b8a6' },
];

export const BrandingSettings = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Brand settings
  const [appName, setAppName] = useState('ZEN POS');
  const [tagline, setTagline] = useState('Management System');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [poweredByText, setPoweredByText] = useState('');
  const [hidePoweredBy, setHidePoweredBy] = useState(false);

  useEffect(() => {
    // Load from localStorage first (fast)
    const cached = localStorage.getItem('hotel_pos_branding');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setAppName(data.appName || 'ZEN POS');
        setTagline(data.tagline || 'Management System');
        setPrimaryColor(data.primaryColor || '#3b82f6');
        setSecondaryColor(data.secondaryColor || '#10b981');
        setPoweredByText(data.poweredByText || '');
        setHidePoweredBy(data.hidePoweredBy || false);
      } catch (e) { /* ignore */ }
    }
    setLoading(false);

    // Background sync from Supabase
    if (profile?.user_id) {
      fetchBranding();
    }
  }, [profile?.user_id]);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('app_name, tagline, brand_primary_color, brand_secondary_color, powered_by_text, hide_powered_by')
        .eq('user_id', profile?.user_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setAppName(data.app_name || 'ZEN POS');
        setTagline(data.tagline || 'Management System');
        setPrimaryColor(data.brand_primary_color || '#3b82f6');
        setSecondaryColor(data.brand_secondary_color || '#10b981');
        setPoweredByText(data.powered_by_text || '');
        setHidePoweredBy(data.hide_powered_by || false);

        // Update cache
        const cacheData = {
          appName: data.app_name || 'ZEN POS',
          tagline: data.tagline || 'Management System',
          primaryColor: data.brand_primary_color || '#3b82f6',
          secondaryColor: data.brand_secondary_color || '#10b981',
          poweredByText: data.powered_by_text || '',
          hidePoweredBy: data.hide_powered_by || false
        };
        localStorage.setItem('hotel_pos_branding', JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const applyBrandingPreview = (color: string) => {
    // Apply custom theme colors (same logic as App.tsx)
    const hexToHSL = (hex: string) => {
      let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { h: 0, s: 0, l: 0 };
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const { h, s, l } = hexToHSL(color);
    const hslString = `${h} ${s}% ${l}%`;
    const glowString = `${h} ${Math.min(s + 5, 100)}% ${Math.min(l + 10, 95)}%`;

    document.documentElement.style.setProperty('--primary', hslString);
    document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
    document.documentElement.style.setProperty('--primary-glow', glowString);
    document.documentElement.style.setProperty('--ring', hslString);

    // Update meta theme color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  };

  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    applyBrandingPreview(color);
  };

  const handleSave = async () => {
    if (!profile?.user_id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('shop_settings')
        .upsert({
          user_id: profile.user_id,
          app_name: appName,
          tagline: tagline,
          brand_primary_color: primaryColor,
          brand_secondary_color: secondaryColor,
          powered_by_text: poweredByText || null,
          hide_powered_by: hidePoweredBy,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Update cache
      const cacheData = {
        appName, tagline, primaryColor, secondaryColor, poweredByText, hidePoweredBy
      };
      localStorage.setItem('hotel_pos_branding', JSON.stringify(cacheData));

      // Also save theme to existing theme storage
      localStorage.setItem('hotel_pos_theme', 'custom');
      localStorage.setItem('hotel_pos_custom_color', primaryColor);

      // Apply branding globally
      applyBrandingPreview(primaryColor);

      // Trigger global event for Header to pick up changes
      window.dispatchEvent(new CustomEvent('branding-changed', { detail: { appName, tagline } }));

      toast({
        title: "Branding Saved",
        description: "Your brand settings have been updated."
      });
    } catch (error) {
      console.error('Error saving branding:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          White-Label Branding
        </CardTitle>
        <CardDescription>
          Customize the app appearance for your business. Changes apply across the entire application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* App Name & Tagline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>App Name</Label>
            <Input
              placeholder="e.g. My Restaurant POS"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">Shown in header and login page</p>
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              placeholder="e.g. Restaurant Management"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">Subtitle below the app name</p>
          </div>
        </div>

        {/* Primary Color */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Brand Primary Color
          </Label>
          
          {/* Preset Colors */}
          <div className="flex flex-wrap gap-2">
            {presetColors.map(color => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  primaryColor === color.value ? 'border-foreground scale-110 ring-2 ring-offset-2' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => handleColorChange(e.target.value)}
                className="w-12 h-10 cursor-pointer rounded border-0"
              />
              <Input
                value={primaryColor}
                onChange={e => handleColorChange(e.target.value)}
                placeholder="#3b82f6"
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
            <span className="text-sm text-muted-foreground">Custom color</span>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl border bg-muted/30">
          <Label className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Live Preview
          </Label>
          <div className="flex items-center gap-3 mt-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
            >
              {appName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-foreground">{appName || 'ZEN POS'}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{tagline || 'Management System'}</div>
            </div>
          </div>
        </div>

        {/* Powered By */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label>Hide "Powered by" on receipts</Label>
            <Switch checked={hidePoweredBy} onCheckedChange={setHidePoweredBy} />
          </div>
          
          {!hidePoweredBy && (
            <div className="space-y-2">
              <Label>Custom "Powered by" text</Label>
              <Input
                placeholder="e.g. Powered by TechSolutions"
                value={poweredByText}
                onChange={e => setPoweredByText(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">Leave empty to hide. Shown on printed receipts.</p>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? "Saving..." : "Save Branding"}
        </Button>

      </CardContent>
    </Card>
  );
};
