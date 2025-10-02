-- Make email column nullable in leads table
-- Some leads might only provide phone numbers initially

ALTER TABLE leads 
ALTER COLUMN email DROP NOT NULL;

-- Update the comment to reflect that email is optional
COMMENT ON COLUMN leads.email IS 'Optional email address for the lead';
