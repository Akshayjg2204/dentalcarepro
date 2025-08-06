-- Update the leads table status constraint to include 'not_interested'

-- First, drop the existing constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the updated constraint with the new 'not_interested' status
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('pending', 'in_consultation', 'completed', 'converted', 'not_interested', 'cancelled'));
