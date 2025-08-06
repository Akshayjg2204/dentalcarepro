-- Add staff_id and doctor_id columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
