-- Fix existing users who don't have proper first_name and last_name values

-- Update users who have empty or null first_name/last_name
-- Extract name from email address as a fallback
UPDATE users 
SET 
  first_name = CASE 
    WHEN first_name IS NULL OR first_name = '' THEN
      INITCAP(split_part(split_part(email, '@', 1), '.', 1))
    ELSE first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL OR last_name = '' THEN
      CASE 
        WHEN position('.' in split_part(email, '@', 1)) > 0 THEN
          INITCAP(split_part(split_part(email, '@', 1), '.', 2))
        ELSE 'User'
      END
    ELSE last_name
  END,
  updated_at = NOW()
WHERE 
  (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');

-- For specific known users, let's set proper names based on the emails visible in the image
UPDATE users 
SET 
  first_name = 'Parth',
  last_name = 'Gaikwad',
  updated_at = NOW()
WHERE email = 'parthgaikwad@gmail.com';

UPDATE users 
SET 
  first_name = 'Shudhanshu',
  last_name = 'Pringle', 
  updated_at = NOW()
WHERE email = 'shudhanshupringle@gmail.com';

UPDATE users 
SET 
  first_name = 'Sampada',
  last_name = 'Gaikwad',
  updated_at = NOW()
WHERE email = 'sampdagaikwad@gmail.com';

-- Ensure all users have at least some name values
UPDATE users 
SET 
  first_name = COALESCE(NULLIF(first_name, ''), 'User'),
  last_name = COALESCE(NULLIF(last_name, ''), 'Name'),
  updated_at = NOW()
WHERE 
  first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '';

-- Verify the update
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM users 
ORDER BY created_at DESC;
