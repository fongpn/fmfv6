/*
  # Create Demo Users Migration
  
  This migration creates demo user profiles that correspond to the demo credentials
  shown on the login page.
  
  Note: The actual auth.users records need to be created through Supabase Auth API
  or the Supabase Dashboard. This migration only creates the profile records.
  
  Demo Credentials:
  - Admin: admin@fmf.com / password123
  - CS: cs@fmf.com / password123
*/

-- Insert demo profiles
-- Note: These UUIDs should match the actual user IDs created in auth.users
-- You'll need to update these UUIDs after creating the users in Supabase Dashboard

DO $$
BEGIN
  -- Check if demo profiles already exist
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO profiles (id, full_name, role, is_active) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Admin User', 'ADMIN', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    INSERT INTO profiles (id, full_name, role, is_active) VALUES
      ('00000000-0000-0000-0000-000000000002', 'Customer Service', 'CS', true);
  END IF;
END $$;