-- Add medical fields to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS current_medications TEXT;
