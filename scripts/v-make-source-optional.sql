-- Make source column nullable in leads table
ALTER TABLE leads ALTER COLUMN source DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN leads.source IS 'Lead source - can be null if not specified during creation';
