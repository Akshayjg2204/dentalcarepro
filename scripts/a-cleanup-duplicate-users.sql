-- Clean up duplicate users and fix data integrity issues

-- First, identify and remove duplicate users (keeping the first one created)
WITH duplicate_users AS (
  SELECT email, 
         array_agg(id ORDER BY created_at) as user_ids,
         count(*) as user_count
  FROM users 
  GROUP BY email 
  HAVING count(*) > 1
),
users_to_delete AS (
  SELECT unnest(user_ids[2:]) as id_to_delete
  FROM duplicate_users
)
DELETE FROM users 
WHERE id IN (SELECT id_to_delete FROM users_to_delete);

-- Clean up any orphaned auth users (users with auth but no profile)
-- This is optional - you can run this to clean up test users
-- DELETE FROM auth.users WHERE email NOT IN (SELECT email FROM public.users);

-- Ensure admin user exists
INSERT INTO users (
  email, 
  first_name, 
  last_name, 
  role
) VALUES (
  'admin@dentalcare.com',
  'Admin',
  'User',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Update any null values in required fields
UPDATE users 
SET 
  medical_conditions = COALESCE(medical_conditions, ''),
  allergies = COALESCE(allergies, ''),
  dental_history = COALESCE(dental_history, '')
WHERE role = 'patient';

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
