/*
  # Demo Users Setup Instructions
  
  This migration provides instructions for setting up demo users.
  
  ## Manual Setup Required:
  
  Since auth.users can only be created through Supabase Auth API (not SQL),
  you need to manually create demo users in the Supabase Dashboard:
  
  1. Go to Supabase Dashboard > Authentication > Users
  2. Click "Add user" and create:
     - Email: admin@fmf.com
     - Password: password123
     - Email Confirm: true
  
  3. Click "Add user" again and create:
     - Email: cs@fmf.com  
     - Password: password123
     - Email Confirm: true
  
  4. After creating each user, copy their User ID
  5. Go to Database > Table Editor > profiles table
  6. Insert profile records with the actual User IDs:
  
     INSERT INTO profiles (id, full_name, role, is_active) VALUES
       ('actual-admin-user-id-here', 'Admin User', 'ADMIN', true),
       ('actual-cs-user-id-here', 'Customer Service', 'CS', true);
  
  ## Alternative: Use the signup process
  
  You can also create users by using the signup functionality in your app
  and then manually updating their profiles in the database.
*/

-- This migration intentionally contains no SQL operations
-- All user creation must be done through Supabase Auth API

SELECT 'Demo users must be created manually through Supabase Dashboard' as setup_instruction;