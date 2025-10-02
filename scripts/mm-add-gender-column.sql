-- Add gender column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment for documentation
COMMENT ON COLUMN users.gender IS 'Patient gender information for medical records';
