-- Update custom_bills table to replace assigned_to with separate doctor and staff columns

-- Add new columns for doctor and staff assignments
ALTER TABLE custom_bills 
ADD COLUMN IF NOT EXISTS assigned_doctor UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_staff UUID REFERENCES users(id) ON DELETE SET NULL;

-- Drop the old assigned_to column if it exists
ALTER TABLE custom_bills 
DROP COLUMN IF EXISTS assigned_to;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_bills_assigned_doctor ON custom_bills(assigned_doctor);
CREATE INDEX IF NOT EXISTS idx_custom_bills_assigned_staff ON custom_bills(assigned_staff);

-- Add comments for documentation
COMMENT ON COLUMN custom_bills.assigned_doctor IS 'Reference to the doctor assigned to this custom bill';
COMMENT ON COLUMN custom_bills.assigned_staff IS 'Reference to the staff member assigned to this custom bill';
