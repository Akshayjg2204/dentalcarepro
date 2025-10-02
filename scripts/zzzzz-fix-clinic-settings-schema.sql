-- Add missing columns to clinic_settings table
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS main_tagline TEXT DEFAULT 'Your Smile is Our Priority',
ADD COLUMN IF NOT EXISTS clinic_description_short TEXT,
ADD COLUMN IF NOT EXISTS clinic_description_long TEXT,
ADD COLUMN IF NOT EXISTS opening_time TIME,
ADD COLUMN IF NOT EXISTS closing_time TIME,
ADD COLUMN IF NOT EXISTS working_days TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Rename emergency_phone to emergency_contact for consistency
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- Copy data from emergency_phone to emergency_contact if it exists
UPDATE clinic_settings 
SET emergency_contact = emergency_phone 
WHERE emergency_phone IS NOT NULL AND emergency_contact IS NULL;

-- Update existing record with better default values
UPDATE clinic_settings SET
  main_tagline = 'Your Smile is Our Priority',
  clinic_description_short = 'Experience world-class dental care with our team of expert dentists. We provide comprehensive, gentle, and personalized treatment for the whole family.',
  clinic_description_long = 'Experience world-class dental care with our team of expert dentists. We provide comprehensive, gentle, and personalized treatment for the whole family.',
  opening_time = '09:00:00',
  closing_time = '18:00:00',
  working_days = 'Monday - Saturday'
WHERE id IS NOT NULL;

-- Remove duplicate social media columns (keep the _url versions)
ALTER TABLE clinic_settings 
DROP COLUMN IF EXISTS facebook,
DROP COLUMN IF EXISTS instagram,
DROP COLUMN IF EXISTS twitter;

-- Remove social media URL columns completely as requested
ALTER TABLE clinic_settings 
DROP COLUMN IF EXISTS facebook_url,
DROP COLUMN IF EXISTS instagram_url,
DROP COLUMN IF EXISTS twitter_url,
DROP COLUMN IF EXISTS linkedin_url;
