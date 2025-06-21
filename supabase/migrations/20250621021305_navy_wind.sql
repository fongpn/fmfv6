/*
  # Complete FMF Gym Management Database Schema
  
  1. New Tables
    - `system_settings` - Global configuration key-value store
    - `profiles` - Staff user profiles with role-based access
    - `allowed_ips` - IP addresses allowed for CS role access
    - `access_requests` - Pending IP approval workflow
    - `members` - Gym member records with unique member IDs
    - `membership_plans` - Admin-defined membership templates
    - `memberships` - Individual membership purchases/renewals
    - `shifts` - Staff shift management with cash reconciliation
    - `coupon_templates` - Admin-defined coupon templates
    - `sold_coupons` - Individual coupons sold to members
    - `products` - POS inventory items
    - `stock_movements` - Inventory change history
    - `transactions` - Central financial transaction log
    - `check_ins` - Member entry/access log

  2. Security
    - Enable RLS on all tables
    - Role-based policies for ADMIN vs CS access
    - Performance indexes for high-volume operations

  3. Business Logic
    - Shift-based operations with cash reconciliation
    - Grace period logic for expired memberships
    - Location-based access control for CS users
    - Comprehensive audit trails
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
    CREATE POLICY "Admins can manage system settings"
        ON system_settings
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
EXCEPTION
    WHEN undefined_table THEN
        -- profiles table doesn't exist yet, skip policy creation
        NULL;
END $$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
    CREATE TRIGGER update_system_settings_updated_at
        BEFORE UPDATE ON system_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 2. Profiles Table (Staff Management)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('ADMIN', 'CS')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
    CREATE POLICY "Users can read own profile"
        ON profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
    CREATE POLICY "Admins can manage all profiles"
        ON profiles
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles profiles_1
                WHERE profiles_1.id = auth.uid() 
                AND profiles_1.role = 'ADMIN'
            )
        );
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
        CREATE INDEX idx_profiles_role ON profiles(role);
    END IF;
END $$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Now create the system_settings policy that references profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
    CREATE POLICY "Admins can manage system settings"
        ON system_settings
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
END $$;

-- 3. Allowed IPs Table (Location-based access control)
CREATE TABLE IF NOT EXISTS allowed_ips (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address text UNIQUE NOT NULL,
    description text,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE allowed_ips ENABLE ROW LEVEL SECURITY;

-- 4. Access Requests Table (IP approval workflow)
CREATE TABLE IF NOT EXISTS access_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id uuid NOT NULL REFERENCES profiles(id),
    ip_address text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
    requested_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES profiles(id)
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 5. Members Table
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

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create policy for members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff can manage members" ON members;
    CREATE POLICY "Staff can manage members"
        ON members
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('ADMIN', 'CS')
            )
        );
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_member_id') THEN
        CREATE INDEX idx_members_member_id ON members(member_id_string);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_email') THEN
        CREATE INDEX idx_members_email ON members(email);
    END IF;
END $$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_members_updated_at ON members;
    CREATE TRIGGER update_members_updated_at
        BEFORE UPDATE ON members
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 6. Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    duration_months integer NOT NULL,
    has_registration_fee boolean DEFAULT true,
    free_months_on_signup integer DEFAULT 0,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON membership_plans;
    CREATE TRIGGER update_membership_plans_updated_at
        BEFORE UPDATE ON membership_plans
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 7. Memberships Table (Individual purchases)
CREATE TABLE IF NOT EXISTS memberships (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id uuid NOT NULL REFERENCES members(id),
    plan_id uuid NOT NULL REFERENCES membership_plans(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
    registration_fee_paid numeric(10,2) DEFAULT 0,
    amount_paid numeric(10,2) NOT NULL,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memberships_member_id') THEN
        CREATE INDEX idx_memberships_member_id ON memberships(member_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memberships_status') THEN
        CREATE INDEX idx_memberships_status ON memberships(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memberships_dates') THEN
        CREATE INDEX idx_memberships_dates ON memberships(start_date, end_date);
    END IF;
END $$;

-- 8. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time timestamptz NOT NULL DEFAULT now(),
    end_time timestamptz,
    starting_staff_id uuid NOT NULL REFERENCES profiles(id),
    ending_staff_id uuid REFERENCES profiles(id),
    starting_cash_float numeric(10,2) NOT NULL,
    ending_cash_balance numeric(10,2),
    system_calculated_cash numeric(10,2),
    cash_discrepancy numeric(10,2),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    notes text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_status') THEN
        CREATE INDEX idx_shifts_status ON shifts(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_start_time') THEN
        CREATE INDEX idx_shifts_start_time ON shifts(start_time);
    END IF;
END $$;

-- 9. Coupon Templates Table
CREATE TABLE IF NOT EXISTS coupon_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    max_entries integer NOT NULL,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_templates ENABLE ROW LEVEL SECURITY;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_coupon_templates_updated_at ON coupon_templates;
    CREATE TRIGGER update_coupon_templates_updated_at
        BEFORE UPDATE ON coupon_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 10. Sold Coupons Table
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

ALTER TABLE sold_coupons ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sold_coupons_code') THEN
        CREATE INDEX idx_sold_coupons_code ON sold_coupons(code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sold_coupons_member_id') THEN
        CREATE INDEX idx_sold_coupons_member_id ON sold_coupons(member_id);
    END IF;
END $$;

-- 11. Products Table (POS)
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    current_stock integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 5,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 12. Stock Movements Table
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

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- 13. Transactions Table (Central financial log)
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id uuid NOT NULL REFERENCES shifts(id),
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    type text NOT NULL CHECK (type IN ('MEMBERSHIP', 'COUPON_SALE', 'POS_SALE', 'WALK_IN', 'REGISTRATION_FEE', 'OTHER')),
    related_id uuid,
    description text,
    processed_by uuid NOT NULL REFERENCES profiles(id),
    status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'OUTSTANDING', 'REFUNDED')),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff can manage transactions" ON transactions;
    CREATE POLICY "Staff can manage transactions"
        ON transactions
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('ADMIN', 'CS')
            )
        );

    DROP POLICY IF EXISTS "Staff can insert transactions" ON transactions;
    CREATE POLICY "Staff can insert transactions"
        ON transactions
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('ADMIN', 'CS')
            )
        );

    DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
    CREATE POLICY "Admins can delete transactions"
        ON transactions
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_shift_id') THEN
        CREATE INDEX idx_transactions_shift_id ON transactions(shift_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_type') THEN
        CREATE INDEX idx_transactions_type ON transactions(type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_created_at') THEN
        CREATE INDEX idx_transactions_created_at ON transactions(created_at);
    END IF;
END $$;

-- 14. Check-ins Table
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

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_ins_member_id') THEN
        CREATE INDEX idx_check_ins_member_id ON check_ins(member_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_check_ins_check_in_time') THEN
        CREATE INDEX idx_check_ins_check_in_time ON check_ins(check_in_time);
    END IF;
END $$;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('grace_period_days', '7', 'Number of days members can access gym after membership expires'),
    ('walk_in_rate', '15.00', 'Rate charged for walk-in access per visit'),
    ('registration_fee_default', '25.00', 'Default one-time registration fee for new members'),
    ('gym_name', 'FMF Gym', 'Name of the gym displayed throughout the system'),
    ('currency_symbol', '$', 'Currency symbol used for displaying prices')
ON CONFLICT (key) DO NOTHING;

-- Insert sample membership plans
INSERT INTO membership_plans (name, price, duration_months, has_registration_fee, free_months_on_signup, description) VALUES
    ('Monthly', 50.00, 1, true, 0, 'Basic monthly membership'),
    ('Quarterly', 135.00, 3, true, 0, '3-month membership with 10% discount'),
    ('Semi-Annual', 240.00, 6, true, 1, '6-month membership with 1 free month'),
    ('Annual', 450.00, 12, true, 2, '12-month membership with 2 free months')
ON CONFLICT DO NOTHING;

-- Insert sample coupon templates
INSERT INTO coupon_templates (name, price, max_entries, duration_days, description) VALUES
    ('10-Visit Pass', 120.00, 10, 90, '10 gym visits valid for 90 days'),
    ('5-Visit Pass', 65.00, 5, 60, '5 gym visits valid for 60 days'),
    ('Trial Week', 25.00, 7, 7, '7-day trial pass for new members')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, price, current_stock, low_stock_threshold, description) VALUES
    ('Protein Bar', 3.50, 50, 10, 'High-protein energy bar'),
    ('Sports Drink', 2.25, 30, 5, 'Electrolyte sports drink'),
    ('Gym Towel', 15.00, 20, 3, 'Premium gym towel'),
    ('Water Bottle', 12.00, 15, 5, 'Branded water bottle'),
    ('Pre-Workout', 35.00, 10, 2, 'Pre-workout supplement')
ON CONFLICT DO NOTHING;