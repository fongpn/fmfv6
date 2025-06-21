# Demo User Setup Guide

## Problem
The demo credentials shown on the login page don't work because no user accounts have been created yet.

## Solution
You need to manually create demo users in Supabase Dashboard since auth users cannot be created through SQL migrations.

## Step-by-Step Instructions

### 1. Create Auth Users
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication > Users**
3. Click **"Add user"**
4. Create first user:
   - **Email**: `admin@fmf.com`
   - **Password**: `password123`
   - **Email Confirm**: Check this box
   - Click **"Add user"**

5. Click **"Add user"** again
6. Create second user:
   - **Email**: `cs@fmf.com`
   - **Password**: `password123`
   - **Email Confirm**: Check this box
   - Click **"Add user"**

### 2. Create Profile Records
1. After creating each user, **copy their User ID** (the UUID shown in the users table)
2. Go to **Database > Table Editor**
3. Select the **profiles** table
4. Click **"Insert row"** and add:
   - **id**: Paste the admin user's UUID
   - **full_name**: `Admin User`
   - **role**: `ADMIN`
   - **is_active**: `true`

5. Click **"Insert row"** again and add:
   - **id**: Paste the CS user's UUID
   - **full_name**: `Customer Service`
   - **role**: `CS`
   - **is_active**: `true`

### 3. Test Login
Now you can use the demo credentials:
- **Admin**: admin@fmf.com / password123
- **CS**: cs@fmf.com / password123

## Alternative Method: SQL Insert
If you prefer, after creating the auth users, you can run this SQL in the SQL Editor:

```sql
-- Replace the UUIDs with the actual user IDs from step 1
INSERT INTO profiles (id, full_name, role, is_active) VALUES
  ('your-actual-admin-user-id-here', 'Admin User', 'ADMIN', true),
  ('your-actual-cs-user-id-here', 'Customer Service', 'CS', true);
```

## Why This Manual Process?
Supabase Auth users can only be created through the Auth API, not through SQL migrations. This is a security feature that prevents unauthorized user creation through database access.