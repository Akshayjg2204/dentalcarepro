-- Add current_medications column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_medications TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN users.current_medications IS 'Current medications the patient is taking';
