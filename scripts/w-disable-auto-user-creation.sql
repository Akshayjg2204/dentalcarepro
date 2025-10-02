-- Disable automatic user creation that's causing unwanted admin users

-- Remove the trigger that automatically creates user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove the function that handles new user creation
DROP FUNCTION IF EXISTS ensure_user_profile();

-- Remove any orphaned auth users that might be causing recreation
-- This will help prevent the automatic recreation of unwanted users
DELETE FROM auth.users 
WHERE email LIKE '%4b388abf%' 
   OR email LIKE 'admin_%@dentalcare.com'
   AND email != 'admin@dentalcare.com';

-- Clean up any duplicate admin users in the users table
DELETE FROM users 
WHERE email LIKE '%4b388abf%' 
   OR (email LIKE 'admin_%@dentalcare.com' AND email != 'admin@dentalcare.com');

-- Ensure we only have one proper admin user
INSERT INTO users (
  email, 
  first_name, 
  last_name, 
  role,
  created_at,
  updated_at
) VALUES (
  'admin@dentalcare.com',
  'Admin',
  'User',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Add a comment to track this change
COMMENT ON TABLE users IS 'Automatic user creation disabled to prevent unwanted admin user recreation';
