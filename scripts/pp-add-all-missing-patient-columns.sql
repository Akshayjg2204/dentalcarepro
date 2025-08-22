-- Add all missing columns for patient profile functionality
-- This script adds all columns that the patient profile modal tries to update

-- Add insurance_provider column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS insurance_provider TEXT;

-- Add emergency contact columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Add medical information columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT;

-- Add date_of_birth column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add address column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Ensure all existing columns are properly set up
-- (gender, current_medications, insurance_policy_number should already exist from previous scripts)

-- Add comments for documentation
COMMENT ON COLUMN users.insurance_provider IS 'Patient insurance provider name';
COMMENT ON COLUMN users.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN users.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN users.medical_history IS 'Patient medical history';
COMMENT ON COLUMN users.allergies IS 'Patient known allergies';
COMMENT ON COLUMN users.date_of_birth IS 'Patient date of birth';
COMMENT ON COLUMN users.address IS 'Patient address';
