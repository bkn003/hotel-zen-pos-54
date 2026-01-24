-- ============================================================
-- HOTEL ZEN POS - COMPLETE SUPABASE DATABASE SCHEMA
-- ============================================================
-- Version: 3.0 (January 2026)
-- This SQL creates the COMPLETE backend for Hotel Zen POS
-- Run this in your Supabase SQL Editor to set up a new project
-- ============================================================

-- ============================================================
-- STEP 1: CREATE ENUMS (Custom Data Types)
-- ============================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment method for bills
DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment mode for payment types table
DO $$ BEGIN
    CREATE TYPE public.payment_mode AS ENUM ('cash', 'card', 'upi', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Service/Kitchen status for orders
DO $$ BEGIN
    CREATE TYPE public.service_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'completed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User account status
DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'paused', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

-- -----------------------------------------
-- PROFILES TABLE (linked to auth.users)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    name text NOT NULL,
    hotel_name text,
    role app_role DEFAULT 'user'::app_role NOT NULL,
    status text DEFAULT 'active',
    admin_id uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- USER PERMISSIONS TABLE (page-level access)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    page_name text NOT NULL,
    has_access boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, page_name)
);

-- -----------------------------------------
-- USER PREFERENCES TABLE (UI settings)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    pos_view text DEFAULT 'list',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- ITEM CATEGORIES TABLE
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.item_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- ITEMS TABLE (Menu items)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES public.profiles(id),
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    purchase_rate numeric,
    category text,
    unit text DEFAULT 'Piece (pc)',
    base_value numeric DEFAULT 1,
    quantity_step numeric DEFAULT 1,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    stock_quantity numeric DEFAULT 0,
    minimum_stock_alert numeric DEFAULT 0,
    unlimited_stock boolean DEFAULT false,
    sale_count integer DEFAULT 0,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- BILLS TABLE (Main billing records)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    created_by uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total_amount numeric NOT NULL,
    discount numeric DEFAULT 0,
    payment_mode payment_method NOT NULL,
    payment_details jsonb DEFAULT '{}'::jsonb,
    additional_charges jsonb DEFAULT '[]'::jsonb,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    kitchen_status service_status DEFAULT 'pending'::service_status,
    service_status service_status DEFAULT 'pending'::service_status,
    status_updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- BILL ITEMS TABLE (Items in each bill)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.bill_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.items(id) NOT NULL,
    quantity numeric NOT NULL,
    price numeric NOT NULL,
    total numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- ADDITIONAL CHARGES TABLE (packing, delivery, etc.)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.additional_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    amount numeric DEFAULT 0 NOT NULL,
    charge_type text NOT NULL,
    unit text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- PAYMENTS TABLE (Payment methods configuration)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    payment_method payment_mode DEFAULT 'cash'::payment_mode,
    is_default boolean DEFAULT false,
    is_disabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- EXPENSE CATEGORIES TABLE
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    admin_id uuid REFERENCES public.profiles(id),
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- EXPENSES TABLE
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES public.profiles(id),
    created_by uuid NOT NULL,
    expense_name text,
    category text NOT NULL,
    amount numeric NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    note text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- SHOP SETTINGS TABLE (Receipt header/footer)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    shop_name text,
    address text,
    contact_number text,
    logo_url text,
    facebook text,
    show_facebook boolean DEFAULT true,
    instagram text,
    show_instagram boolean DEFAULT true,
    whatsapp text,
    show_whatsapp boolean DEFAULT true,
    printer_width text DEFAULT '58mm',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------
-- BLUETOOTH SETTINGS TABLE
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.bluetooth_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    is_enabled boolean DEFAULT false NOT NULL,
    auto_print boolean DEFAULT false NOT NULL,
    printer_name text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------
-- DISPLAY SETTINGS TABLE (items per row, category order)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.display_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    items_per_row integer DEFAULT 3 NOT NULL,
    category_order text[] DEFAULT ARRAY[]::text[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bills_kitchen_status ON public.bills(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_bills_service_status ON public.bills(service_status);
CREATE INDEX IF NOT EXISTS idx_bills_status_updated_at ON public.bills(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_admin_id ON public.bills(admin_id);
CREATE INDEX IF NOT EXISTS idx_items_display_order ON public.items(display_order);
CREATE INDEX IF NOT EXISTS idx_items_admin_id ON public.items(admin_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_admin_id ON public.expenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_id ON public.profiles(admin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bluetooth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ============================================================

-- Function: Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Function: Get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Function: Get current user's admin_id (for sub-users)
CREATE OR REPLACE FUNCTION public.get_my_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT admin_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'user'
$$;

-- Function: Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
$$;

-- Function: Check if current user is admin or super admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
$$;

-- Function: Get user's admin_id for RLS (returns profile.id for admins, admin_id for sub-users)
CREATE OR REPLACE FUNCTION public.get_user_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
    THEN NULL
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    THEN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ELSE (SELECT admin_id FROM public.profiles WHERE user_id = auth.uid())
  END
$$;

-- Function: Check if user has access to a specific page
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = 'admin') THEN true
    ELSE COALESCE((SELECT has_access FROM public.user_permissions WHERE user_id = _user_id AND page_name = _page_name), false)
  END
$$;

-- Function: Get current user's permissions
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(page_name text, has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT up.page_name, up.has_access
  FROM user_permissions up
  WHERE up.user_id = auth.uid();
END;
$$;

-- Function: Check if user is allowed to login (considering pause cascade)
CREATE OR REPLACE FUNCTION public.is_user_allowed_to_login(p_user_id uuid)
RETURNS TABLE(allowed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_status text;
  v_user_role text;
  v_admin_id uuid;
  v_admin_status text;
BEGIN
  SELECT status, role, admin_id INTO v_user_status, v_user_role, v_admin_id
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_user_status IS NULL THEN
    RETURN QUERY SELECT true, 'new_user'::text;
    RETURN;
  END IF;

  IF v_user_status = 'paused' THEN
    RETURN QUERY SELECT false, 'Account paused'::text;
    RETURN;
  END IF;

  IF v_user_status = 'deleted' THEN
    RETURN QUERY SELECT false, 'Account deleted'::text;
    RETURN;
  END IF;

  IF v_user_role = 'user' AND v_admin_id IS NOT NULL THEN
    SELECT status INTO v_admin_status
    FROM public.profiles
    WHERE id = v_admin_id;

    IF v_admin_status = 'paused' THEN
      RETURN QUERY SELECT false, 'Account paused by Super Admin'::text;
      RETURN;
    END IF;

    IF v_admin_status = 'deleted' THEN
      RETURN QUERY SELECT false, 'Parent admin account deleted'::text;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT true, 'active'::text;
END;
$$;

-- ============================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_additional_charges_updated_at ON public.additional_charges;
CREATE TRIGGER update_additional_charges_updated_at
    BEFORE UPDATE ON public.additional_charges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_display_settings_updated_at ON public.display_settings;
CREATE TRIGGER update_display_settings_updated_at
    BEFORE UPDATE ON public.display_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bluetooth_settings_updated_at ON public.bluetooth_settings;
CREATE TRIGGER update_bluetooth_settings_updated_at
    BEFORE UPDATE ON public.bluetooth_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_categories_updated_at ON public.item_categories;
CREATE TRIGGER update_item_categories_updated_at
    BEFORE UPDATE ON public.item_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_settings_updated_at ON public.shop_settings;
CREATE TRIGGER update_shop_settings_updated_at
    BEFORE UPDATE ON public.shop_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================

-- -----------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
CREATE POLICY "View own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admin view all" ON public.profiles;
CREATE POLICY "Super admin view all"
ON public.profiles FOR SELECT
USING (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Admin view sub-users" ON public.profiles;
CREATE POLICY "Admin view sub-users"
ON public.profiles FOR SELECT
USING (admin_id = get_my_profile_id());

DROP POLICY IF EXISTS "Child users view admin profile" ON public.profiles;
CREATE POLICY "Child users view admin profile"
ON public.profiles FOR SELECT
USING (id = get_my_admin_id());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert sub-user profiles" ON public.profiles;
CREATE POLICY "Admins can insert sub-user profiles"
ON public.profiles FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::app_role
));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin update sub-users" ON public.profiles;
CREATE POLICY "Admin update sub-users"
ON public.profiles FOR UPDATE
USING (admin_id = get_my_profile_id());

DROP POLICY IF EXISTS "Super admin update any" ON public.profiles;
CREATE POLICY "Super admin update any"
ON public.profiles FOR UPDATE
USING ((get_my_role() = 'super_admin') AND (role = 'admin'::app_role));

-- -----------------------------------------
-- USER PERMISSIONS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and Super Admins can view all permissions" ON public.user_permissions;
CREATE POLICY "Admins and Super Admins can view all permissions"
ON public.user_permissions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
));

DROP POLICY IF EXISTS "Admins and Super Admins can insert permissions" ON public.user_permissions;
CREATE POLICY "Admins and Super Admins can insert permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
));

DROP POLICY IF EXISTS "Admins and Super Admins can update permissions" ON public.user_permissions;
CREATE POLICY "Admins and Super Admins can update permissions"
ON public.user_permissions FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
));

DROP POLICY IF EXISTS "Admins and Super Admins can delete permissions" ON public.user_permissions;
CREATE POLICY "Admins and Super Admins can delete permissions"
ON public.user_permissions FOR DELETE
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
));

-- -----------------------------------------
-- USER PREFERENCES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- -----------------------------------------
-- ITEM CATEGORIES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full item categories access" ON public.item_categories;
CREATE POLICY "Full item categories access"
ON public.item_categories FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR (admin_id IS NULL));

-- -----------------------------------------
-- ITEMS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full items access" ON public.items;
CREATE POLICY "Full items access"
ON public.items FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR (admin_id IS NULL));

-- -----------------------------------------
-- BILLS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full bills access" ON public.bills;
CREATE POLICY "Full bills access"
ON public.bills FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR ((admin_id IS NULL) AND (created_by = auth.uid())) OR (admin_id IS NULL));

-- -----------------------------------------
-- BILL ITEMS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can view bill items" ON public.bill_items;
CREATE POLICY "Users can view bill items"
ON public.bill_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create bill items" ON public.bill_items;
CREATE POLICY "Users can create bill items"
ON public.bill_items FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage bill items" ON public.bill_items;
CREATE POLICY "Admins can manage bill items"
ON public.bill_items FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::app_role
));

-- -----------------------------------------
-- ADDITIONAL CHARGES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full additional charges access" ON public.additional_charges;
CREATE POLICY "Full additional charges access"
ON public.additional_charges FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR (admin_id IS NULL));

-- -----------------------------------------
-- PAYMENTS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full payments access" ON public.payments;
CREATE POLICY "Full payments access"
ON public.payments FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR (admin_id IS NULL));

-- -----------------------------------------
-- EXPENSE CATEGORIES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full expense categories access" ON public.expense_categories;
CREATE POLICY "Full expense categories access"
ON public.expense_categories FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR (admin_id IS NULL));

-- -----------------------------------------
-- EXPENSES POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Full expenses access" ON public.expenses;
CREATE POLICY "Full expenses access"
ON public.expenses FOR ALL
USING (is_super_admin() OR (admin_id = get_user_admin_id()) OR ((admin_id IS NULL) AND (created_by = auth.uid())) OR (admin_id IS NULL));

-- -----------------------------------------
-- SHOP SETTINGS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can view own settings" ON public.shop_settings;
CREATE POLICY "Users can view own settings"
ON public.shop_settings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.shop_settings;
CREATE POLICY "Users can insert own settings"
ON public.shop_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.shop_settings;
CREATE POLICY "Users can update own settings"
ON public.shop_settings FOR UPDATE
USING (auth.uid() = user_id);

-- -----------------------------------------
-- BLUETOOTH SETTINGS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can view their own bluetooth settings" ON public.bluetooth_settings;
CREATE POLICY "Users can view their own bluetooth settings"
ON public.bluetooth_settings FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own bluetooth settings" ON public.bluetooth_settings;
CREATE POLICY "Users can insert their own bluetooth settings"
ON public.bluetooth_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own bluetooth settings" ON public.bluetooth_settings;
CREATE POLICY "Users can update their own bluetooth settings"
ON public.bluetooth_settings FOR UPDATE
USING (user_id = auth.uid());

-- -----------------------------------------
-- DISPLAY SETTINGS POLICIES
-- -----------------------------------------
DROP POLICY IF EXISTS "Users can manage their own display settings" ON public.display_settings;
CREATE POLICY "Users can manage their own display settings"
ON public.display_settings FOR ALL
USING (auth.uid() = user_id);

-- ============================================================
-- STEP 8: GRANT FUNCTION PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_page_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_allowed_to_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_allowed_to_login(uuid) TO anon;

-- ============================================================
-- STEP 9: INSERT DEFAULT DATA
-- ============================================================

-- Default Payment Methods (only if table is empty)
INSERT INTO public.payments (payment_type, payment_method, is_default, is_disabled)
SELECT 'Cash', 'cash', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE payment_type = 'Cash');

INSERT INTO public.payments (payment_type, payment_method, is_default, is_disabled)
SELECT 'UPI', 'upi', false, false
WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE payment_type = 'UPI');

INSERT INTO public.payments (payment_type, payment_method, is_default, is_disabled)
SELECT 'Card', 'card', false, false
WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE payment_type = 'Card');

-- Default Expense Categories (only if table is empty)
INSERT INTO public.expense_categories (name)
SELECT 'Rent'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Rent');

INSERT INTO public.expense_categories (name)
SELECT 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Utilities');

INSERT INTO public.expense_categories (name)
SELECT 'Salaries'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Salaries');

INSERT INTO public.expense_categories (name)
SELECT 'Supplies'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Supplies');

INSERT INTO public.expense_categories (name)
SELECT 'Maintenance'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Maintenance');

INSERT INTO public.expense_categories (name)
SELECT 'Other'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name = 'Other');

-- Default Item Categories (only if table is empty)
INSERT INTO public.item_categories (name)
SELECT 'Food'
WHERE NOT EXISTS (SELECT 1 FROM public.item_categories WHERE name = 'Food');

INSERT INTO public.item_categories (name)
SELECT 'Beverages'
WHERE NOT EXISTS (SELECT 1 FROM public.item_categories WHERE name = 'Beverages');

INSERT INTO public.item_categories (name)
SELECT 'Snacks'
WHERE NOT EXISTS (SELECT 1 FROM public.item_categories WHERE name = 'Snacks');

-- ============================================================
-- STEP 10: CREATE STORAGE BUCKET FOR IMAGES
-- ============================================================

-- Create storage bucket for item images (run separately in Supabase Dashboard if needed)
INSERT INTO storage.buckets (id, name, public)
SELECT 'item-images', 'item-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'item-images');

-- Storage policies for item-images bucket
DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their item images" ON storage.objects;
CREATE POLICY "Users can update their item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their item images" ON storage.objects;
CREATE POLICY "Users can delete their item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-images' AND auth.role() = 'authenticated');

-- ============================================================
-- STEP 11: ENABLE REALTIME (Optional)
-- ============================================================

-- Enable realtime for bills table (for KDS/Service Area sync)
-- Run this command separately in Supabase Dashboard:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================
-- 
-- NEXT STEPS:
-- 1. Go to Authentication > Settings and enable Email Auth
-- 2. Update your .env file with the new Supabase URL and anon key
-- 3. Sign up with the first user (they become admin)
-- 4. To create a super_admin, manually update a profile:
--    UPDATE profiles SET role = 'super_admin' WHERE user_id = 'YOUR_USER_ID';
--
-- ============================================================
-- SUMMARY:
-- ============================================================
-- 
-- ENUMS (5): app_role, payment_method, payment_mode, service_status, user_status
-- TABLES (14): profiles, user_permissions, user_preferences, item_categories,
--              items, bills, bill_items, additional_charges, payments,
--              expense_categories, expenses, shop_settings, bluetooth_settings,
--              display_settings
-- FUNCTIONS (10): update_updated_at_column, get_my_role, get_my_profile_id,
--                 get_my_admin_id, is_super_admin, is_admin_or_super,
--                 get_user_admin_id, has_page_permission, get_my_permissions,
--                 is_user_allowed_to_login
-- TRIGGERS (12): Auto-update timestamps for all tables
-- RLS POLICIES (30+): Full row-level security with admin/user/super_admin support
-- INDEXES (12): Optimized for common queries
-- STORAGE: item-images bucket with public read access
--
-- ============================================================
