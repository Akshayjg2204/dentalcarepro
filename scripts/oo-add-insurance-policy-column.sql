-- Add missing insurance_policy_number column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.insurance_policy_number IS 'Patient insurance policy number';
