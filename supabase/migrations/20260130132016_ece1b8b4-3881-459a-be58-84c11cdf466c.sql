-- Add white-label branding columns to shop_settings
ALTER TABLE public.shop_settings 
ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'ZEN POS',
ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Management System',
ADD COLUMN IF NOT EXISTS powered_by_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hide_powered_by BOOLEAN DEFAULT false;