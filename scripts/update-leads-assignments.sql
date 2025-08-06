-- Add separate columns for doctor and staff assignments
ALTER TABLE leads 
ADD COLUMN assigned_doctor UUID REFERENCES users(id),
ADD COLUMN assigned_staff UUID REFERENCES users(id);

-- Update the existing assigned_to data to assigned_doctor if the user is a doctor
UPDATE leads 
SET assigned_doctor = assigned_to 
WHERE assigned_to IN (
  SELECT id FROM users WHERE role = 'doctor'
);

-- Update the existing assigned_to data to assigned_staff if the user is staff
UPDATE leads 
SET assigned_staff = assigned_to 
WHERE assigned_to IN (
  SELECT id FROM users WHERE role = 'staff'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_doctor ON leads(assigned_doctor);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_staff ON leads(assigned_staff);

-- We'll keep the old assigned_to column for now to avoid breaking existing functionality
-- It can be dropped later after confirming everything works
