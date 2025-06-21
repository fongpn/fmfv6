/*
  # FMF Gym Management System - Initial Database Schema

  1. Core Tables
    - `system_settings` - Global configuration key-value store
    - `profiles` - Staff user profiles linked to auth.users
    - `allowed_ips` - IP addresses allowed for CS role login
    - `access_requests` - Pending IP approval requests
    - `shifts` - Staff shift management with cash reconciliation
    - `members` - Gym member records
    - `membership_plans` - Admin-defined membership plan templates
    - `memberships` - Individual membership purchases/renewals
    - `coupon_templates` - Admin-defined coupon templates
    - `sold_coupons` - Individual coupons sold to members
    - `products` - POS inventory items
    - `stock_movements` - Inventory change history
    - `transactions` - Central financial transaction log
    - `check_ins` - Member entry/access log

  2. Security
    - Enable RLS on all tables
    - Add policies for ADMIN and CS roles
    - Secure financial and sensitive data access

  3. Indexes
    - Performance indexes for frequently queried columns
    - Unique constraints for business rules
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('grace_period_days', '7', 'Number of days members can access gym after membership expires'),
  ('walk_in_rate', '15.00', 'Rate charged for walk-in access (per visit)'),
  ('registration_fee_default', '25.00', 'Default one-time registration fee for new members'),
  ('gym_name', 'FMF Fitness', 'Name of the gym'),
  ('currency_symbol', '$', 'Currency symbol for display')
ON CONFLICT (key) DO NOTHING;

-- Staff Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'CS')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allowed IPs for CS Role Location Control
CREATE TABLE IF NOT EXISTS allowed_ips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address text UNIQUE NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Access Requests for IP Approval Workflow
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  ip_address text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id)
);

-- Shifts Table for Cash Reconciliation
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  starting_staff_id uuid NOT NULL REFERENCES profiles(id),
  ending_staff_id uuid REFERENCES profiles(id),
  starting_cash_float decimal(10,2) NOT NULL,
  ending_cash_balance decimal(10,2),
  system_calculated_cash decimal(10,2),
  cash_discrepancy decimal(10,2),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id_string text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone_number text,
  photo_url text,
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  duration_months integer NOT NULL,
  has_registration_fee boolean DEFAULT true,
  free_months_on_signup integer DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default membership plans
INSERT INTO membership_plans (name, price, duration_months, has_registration_fee, free_months_on_signup, description) VALUES
  ('Monthly', 49.99, 1, true, 0, 'Basic monthly membership'),
  ('Quarterly', 129.99, 3, true, 0, '3-month membership plan'),
  ('Annual', 449.99, 12, true, 1, 'Annual membership with 1 free month'),
  ('Student Monthly', 39.99, 1, false, 0, 'Discounted monthly plan for students')
ON CONFLICT DO NOTHING;

-- Memberships Table (Individual Purchases)
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL REFERENCES members(id),
  plan_id uuid NOT NULL REFERENCES membership_plans(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
  registration_fee_paid decimal(10,2) DEFAULT 0,
  amount_paid decimal(10,2) NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Coupon Templates Table
CREATE TABLE IF NOT EXISTS coupon_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  max_entries integer NOT NULL,
  duration_days integer NOT NULL,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default coupon templates
INSERT INTO coupon_templates (name, price, max_entries, duration_days, description) VALUES
  ('5-Visit Pass', 65.00, 5, 30, '5 gym visits valid for 30 days'),
  ('10-Visit Pass', 120.00, 10, 60, '10 gym visits valid for 60 days'),
  ('Day Pass', 15.00, 1, 1, 'Single day access pass')
ON CONFLICT DO NOTHING;

-- Sold Coupons Table
CREATE TABLE IF NOT EXISTS sold_coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES coupon_templates(id),
  code text UNIQUE NOT NULL,
  member_id uuid REFERENCES members(id),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  entries_remaining integer NOT NULL,
  is_active boolean DEFAULT true,
  sold_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Products Table for POS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  current_stock integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert sample products
INSERT INTO products (name, price, current_stock, description) VALUES
  ('Protein Bar', 3.50, 50, 'High protein energy bar'),
  ('Sports Drink', 2.25, 30, 'Electrolyte sports drink'),
  ('Gym Towel', 12.99, 20, 'Premium gym towel'),
  ('Water Bottle', 8.99, 15, 'Branded water bottle')
ON CONFLICT DO NOTHING;

-- Stock Movements Table for Inventory History
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id),
  change_quantity integer NOT NULL,
  reason text NOT NULL,
  transaction_id uuid,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Transactions Table (Central Financial Log)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid NOT NULL REFERENCES shifts(id),
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  type text NOT NULL CHECK (type IN ('MEMBERSHIP', 'COUPON_SALE', 'POS_SALE', 'WALK_IN', 'REGISTRATION_FEE', 'OTHER')),
  related_id uuid,
  description text,
  processed_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'OUTSTANDING', 'REFUNDED')),
  created_at timestamptz DEFAULT now()
);

-- Check-ins Table (Entry Log)
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid NOT NULL REFERENCES shifts(id),
  type text NOT NULL CHECK (type IN ('MEMBERSHIP', 'COUPON', 'WALK_IN', 'GRACE_PERIOD')),
  member_id uuid REFERENCES members(id),
  sold_coupon_id uuid REFERENCES sold_coupons(id),
  processed_by uuid NOT NULL REFERENCES profiles(id),
  check_in_time timestamptz DEFAULT now(),
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id_string);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_check_ins_member_id ON check_ins(member_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_time ON check_ins(check_in_time);
CREATE INDEX IF NOT EXISTS idx_sold_coupons_member_id ON sold_coupons(member_id);
CREATE INDEX IF NOT EXISTS idx_sold_coupons_code ON sold_coupons(code);

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sold_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic - can be expanded based on specific requirements)

-- Profiles: Users can read their own profile, admins can manage all
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- System Settings: Only admins can manage
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Members: CS and Admin can read/write
CREATE POLICY "Staff can manage members" ON members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CS')
    )
  );

-- Transactions: Staff can read/write, but only admins can delete
CREATE POLICY "Staff can manage transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CS')
    )
  );

CREATE POLICY "Staff can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CS')
    )
  );

CREATE POLICY "Admins can delete transactions" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Similar policies for other tables...
-- (Additional policies can be added as needed for specific business rules)

-- Functions for business logic
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupon_templates_updated_at BEFORE UPDATE ON coupon_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();