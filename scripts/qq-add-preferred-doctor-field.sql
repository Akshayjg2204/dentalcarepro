-- Add preferred_doctor field to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferred_doctor TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN appointments.preferred_doctor IS 'Patient preference for doctor type (Senior Doctor, Junior Doctor)';
