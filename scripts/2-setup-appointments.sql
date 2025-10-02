-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type TEXT NOT NULL,
  notes TEXT,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointment types table
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER DEFAULT 30,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default appointment types
INSERT INTO appointment_types (name, duration_minutes, description) VALUES
  ('General Checkup', 30, 'Routine dental examination and cleaning'),
  ('Teeth Cleaning', 45, 'Professional dental cleaning and polishing'),
  ('Filling', 60, 'Dental filling for cavities'),
  ('Root Canal', 90, 'Root canal treatment'),
  ('Tooth Extraction', 45, 'Tooth removal procedure'),
  ('Consultation', 30, 'Initial consultation and treatment planning'),
  ('Emergency', 30, 'Emergency dental care'),
  ('Crown Placement', 75, 'Installation of dental crown for tooth protection'),
  ('Orthodontic Consultation', 30, 'Initial consultation for braces or aligners'),
  ('Teeth Whitening', 60, 'Professional teeth whitening treatment'),
  ('Dental Implant', 120, 'Surgical placement of dental implant'),
  ('Periodontal Treatment', 60, 'Treatment for gum disease and periodontal issues'),
  ('Oral Surgery', 90, 'Various oral surgical procedures')
ON CONFLICT (name) DO NOTHING;

-- Create time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time_slot TIME NOT NULL UNIQUE,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert time slots from 10 AM to 10 PM (30-minute intervals)
INSERT INTO time_slots (time_slot) VALUES
  ('10:00:00'), ('10:30:00'), ('11:00:00'), ('11:30:00'),
  ('12:00:00'), ('12:30:00'), ('13:00:00'), ('13:30:00'),
  ('14:00:00'), ('14:30:00'), ('15:00:00'), ('15:30:00'),
  ('16:00:00'), ('16:30:00'), ('17:00:00'), ('17:30:00'),
  ('18:00:00'), ('18:30:00'), ('19:00:00'), ('19:30:00'),
  ('20:00:00'), ('20:30:00'), ('21:00:00'), ('21:30:00'),
  ('22:00:00')
ON CONFLICT (time_slot) DO NOTHING;

-- Disable RLS for appointments tables
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for appointments
CREATE OR REPLACE FUNCTION update_appointments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE
    ON appointments FOR EACH ROW EXECUTE FUNCTION update_appointments_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_name ON appointment_types(name);
