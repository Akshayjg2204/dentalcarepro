-- Fix leads table schema to match TypeScript interface
-- Add missing email and source columns, update status values

-- First, add the missing columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Update the status constraint to match TypeScript interface
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'not_interested'));

-- Update existing records to have valid status values
UPDATE leads SET status = 'new' WHERE status = 'pending';
UPDATE leads SET status = 'contacted' WHERE status IN ('in_consultation', 'contacted', 'follow_up');
UPDATE leads SET status = 'converted' WHERE status = 'completed';
UPDATE leads SET status = 'not_interested' WHERE status = 'cancelled';

-- Set default source for existing records
UPDATE leads SET source = 'website' WHERE source IS NULL;

-- Make email and source NOT NULL after setting defaults
ALTER TABLE leads ALTER COLUMN email SET NOT NULL;
ALTER TABLE leads ALTER COLUMN source SET NOT NULL;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
