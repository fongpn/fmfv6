# Setup Instructions for Demo Users

## Creating Demo User Accounts

The application requires user accounts to be created in Supabase Auth before they can log in. Follow these steps to create the demo accounts:

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users

### Step 2: Create Admin User
1. Click "Add user" 
2. Enter email: `admin@fmf.com`
3. Enter password: `password123`
4. Click "Create user"
5. Copy the generated User ID

### Step 3: Create CS User  
1. Click "Add user"
2. Enter email: `cs@fmf.com`
3. Enter password: `password123`
4. Click "Create user"
5. Copy the generated User ID

### Step 4: Update Profile Records
After creating the users, you need to update the profile records with the correct User IDs:

1. Go to Database > Table Editor
2. Select the `profiles` table
3. Update the demo profile records with the actual User IDs from Step 2 and 3

Alternatively, you can run this SQL in the SQL Editor:

```sql
-- Update with actual User IDs from Supabase Auth
UPDATE profiles 
SET id = 'ACTUAL_ADMIN_USER_ID_HERE' 
WHERE full_name = 'Admin User';

UPDATE profiles 
SET id = 'ACTUAL_CS_USER_ID_HERE' 
WHERE full_name = 'Customer Service';
```

### Step 5: Test Login
Now you should be able to log in with:
- Admin: admin@fmf.com / password123
- CS: cs@fmf.com / password123

## Alternative: Automatic User Creation

If you prefer to create users programmatically, you can use the Supabase Admin API or create an Edge Function to handle user creation. However, for demo purposes, manual creation through the dashboard is the simplest approach.