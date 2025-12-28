-- ============================================================
-- COMPLETE SUPABASE DATABASE SCHEMA FOR HOTEL POS
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to create the complete backend
-- ============================================================

-- ============================================================
-- STEP 1: CREATE ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'card', 'upi', 'online');
CREATE TYPE public.user_status AS ENUM ('active', 'paused', 'deleted');

-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name text NOT NULL,
    hotel_name text,
    role app_role DEFAULT 'user'::app_role NOT NULL,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- User Permissions table (controls page access for non-admin users)
CREATE TABLE public.user_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    page_name text NOT NULL,
    has_access boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, page_name)
);

-- User Preferences table
CREATE TABLE public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    pos_view text DEFAULT 'grid',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Item Categories table
CREATE TABLE public.item_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Items table
CREATE TABLE public.items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    purchase_rate numeric,
    category text,
    unit text,
    base_value numeric,
    quantity_step numeric,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    stock_quantity numeric,
    minimum_stock_alert numeric,
    sale_count integer DEFAULT 0,
    display_order integer DEFAULT 0,  -- For drag-and-drop item reordering
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Bills table
CREATE TABLE public.bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no text NOT NULL UNIQUE,
    created_by uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total_amount numeric NOT NULL,
    discount numeric DEFAULT 0,
    payment_mode payment_method NOT NULL,
    payment_details jsonb,
    additional_charges jsonb,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Bill Items table
CREATE TABLE public.bill_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.items(id) NOT NULL,
    quantity numeric NOT NULL,
    price numeric NOT NULL,
    total numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Additional Charges table (for packing, delivery, etc.)
CREATE TABLE public.additional_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    charge_type text NOT NULL,
    unit text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Payments table (payment methods configuration)
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type text NOT NULL,
    payment_method payment_mode,
    is_default boolean DEFAULT false,
    is_disabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Expense Categories table
CREATE TABLE public.expense_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Expenses table
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid,
    created_by uuid NOT NULL,
    expense_name text,
    category text NOT NULL,
    amount numeric NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    note text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Shop Settings table (for receipt header/footer)
CREATE TABLE public.shop_settings (
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
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Bluetooth Settings table
CREATE TABLE public.bluetooth_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    is_enabled boolean DEFAULT false NOT NULL,
    auto_print boolean DEFAULT false NOT NULL,
    printer_name text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Display Settings table (items per row, category order)
CREATE TABLE public.display_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    items_per_row integer DEFAULT 3 NOT NULL,
    category_order text[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
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
-- STEP 4: CREATE SECURITY HELPER FUNCTION
-- ============================================================

-- Helper function to check if user has a specific role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to get user's admin_id (for multi-tenant isolation)
CREATE OR REPLACE FUNCTION public.get_admin_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN role = 'admin' THEN user_id
    ELSE (SELECT p2.user_id FROM public.profiles p2 WHERE p2.role = 'admin' LIMIT 1)
  END
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- ============================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert their profile on signup"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User Permissions Policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage permissions"
ON public.user_permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User Preferences Policies
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Item Categories Policies (shared across organization)
CREATE POLICY "Authenticated users can view item categories"
ON public.item_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage item categories"
ON public.item_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Items Policies
CREATE POLICY "Authenticated users can view active items"
ON public.items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage items"
ON public.items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Bills Policies
CREATE POLICY "Users can view all bills"
ON public.bills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create bills"
ON public.bills FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update bills"
ON public.bills FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bills"
ON public.bills FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Bill Items Policies
CREATE POLICY "Authenticated users can view bill items"
ON public.bill_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create bill items"
ON public.bill_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage bill items"
ON public.bill_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Additional Charges Policies
CREATE POLICY "Authenticated users can view additional charges"
ON public.additional_charges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage additional charges"
ON public.additional_charges FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Payments Policies
CREATE POLICY "Authenticated users can view payments"
ON public.payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage payments"
ON public.payments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Expense Categories Policies
CREATE POLICY "Authenticated users can view expense categories"
ON public.expense_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage expense categories"
ON public.expense_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Expenses Policies
CREATE POLICY "Users can view all expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all expenses"
ON public.expenses FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Shop Settings Policies
CREATE POLICY "Users can view shop settings"
ON public.shop_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own shop settings"
ON public.shop_settings FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Bluetooth Settings Policies
CREATE POLICY "Users can manage their own bluetooth settings"
ON public.bluetooth_settings FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Display Settings Policies
CREATE POLICY "Users can manage their own display settings"
ON public.display_settings FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- STEP 6: CREATE TRIGGER FOR AUTO-CREATING PROFILE
-- ============================================================

-- Function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
      THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 7: INSERT DEFAULT DATA
-- ============================================================

-- Default Payment Methods
INSERT INTO public.payments (payment_type, payment_method, is_default, is_disabled) VALUES
('Cash', 'cash', true, false),
('UPI', 'upi', false, false),
('Card', 'card', false, false);

-- Default Expense Categories
INSERT INTO public.expense_categories (name) VALUES
('Rent'),
('Utilities'),
('Salaries'),
('Supplies'),
('Maintenance'),
('Marketing'),
('Other');

-- Default Item Categories
INSERT INTO public.item_categories (name) VALUES
('Food'),
('Beverages'),
('Snacks'),
('Desserts');

-- ============================================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_is_active ON public.items(is_active);
CREATE INDEX idx_items_display_order ON public.items(display_order);
CREATE INDEX idx_bills_date ON public.bills(date);
CREATE INDEX idx_bills_created_by ON public.bills(created_by);
CREATE INDEX idx_bills_created_at ON public.bills(created_at);
CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);

-- ============================================================
-- COMPLETE! Your Hotel POS backend is ready.
-- ============================================================
-- Next steps:
-- 1. Enable Email Auth in Supabase Auth settings
-- 2. Set up Storage bucket for images (optional)
-- 3. Connect your frontend to this Supabase project
-- ============================================================
