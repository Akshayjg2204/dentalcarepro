-- Simplify lead status to only 3 options: ongoing (default), converted, not_converted

-- Update existing leads to the new simplified statuses
UPDATE leads 
SET status = CASE 
  WHEN status IN ('new', 'contacted', 'qualified') THEN 'ongoing'
  WHEN status = 'not_interested' THEN 'not_converted'
  ELSE status
END;

-- Drop the old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new simplified constraint with only 3 statuses
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('ongoing', 'converted', 'not_converted'));

-- Set default status to 'ongoing'
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'ongoing';

-- Update any NULL statuses to 'ongoing'
UPDATE leads SET status = 'ongoing' WHERE status IS NULL;
