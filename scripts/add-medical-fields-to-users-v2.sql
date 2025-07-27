-- Add missing medical fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS dental_history TEXT;

-- Update any existing records to have empty strings instead of null for these fields
UPDATE users 
SET 
  medical_conditions = COALESCE(medical_conditions, ''),
  allergies = COALESCE(allergies, ''),
  dental_history = COALESCE(dental_history, '')
WHERE role = 'patient';

-- Add comments to document the new columns
COMMENT ON COLUMN users.medical_conditions IS 'Patient medical conditions and medications';
COMMENT ON COLUMN users.allergies IS 'Patient allergies and sensitivities';
COMMENT ON COLUMN users.dental_history IS 'Patient dental treatment history and notes';
