-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type TEXT NOT NULL,
  notes TEXT,
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
  ('Emergency', 30, 'Emergency dental care')
ON CONFLICT (name) DO NOTHING;

-- Create time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time_slot TIME NOT NULL UNIQUE,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default time slots (9 AM to 6 PM, 30-minute intervals)
INSERT INTO time_slots (time_slot) VALUES
  ('09:00:00'), ('09:30:00'), ('10:00:00'), ('10:30:00'),
  ('11:00:00'), ('11:30:00'), ('12:00:00'), ('12:30:00'),
  ('13:00:00'), ('13:30:00'), ('14:00:00'), ('14:30:00'),
  ('15:00:00'), ('15:30:00'), ('16:00:00'), ('16:30:00'),
  ('17:00:00'), ('17:30:00')
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
