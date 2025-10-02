-- Update lead status options to include converted, not_converted, and ongoing
-- This replaces the old status system with a clearer workflow

-- Drop the old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new constraint with updated status options
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'ongoing', 'converted', 'not_converted'));

-- Update any existing 'not_interested' status to 'not_converted' for consistency
UPDATE leads SET status = 'not_converted' WHERE status = 'not_interested';

-- Set default status for new leads
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';

COMMENT ON COLUMN leads.status IS 'Lead status: new (initial), contacted (first contact made), qualified (potential patient), ongoing (in consultation process), converted (became patient), not_converted (did not convert)';
