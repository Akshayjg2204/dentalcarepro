-- Create clinic_availability table for managing appointment availability
CREATE TABLE IF NOT EXISTS clinic_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  is_closed BOOLEAN DEFAULT false,
  custom_open_time TIME,
  custom_close_time TIME,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Create blocked_time_slots table for specific time blocking
CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  is_blocked BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, time_slot)
);

-- Disable RLS for these tables
ALTER TABLE clinic_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_time_slots DISABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_clinic_availability_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clinic_availability_updated_at ON clinic_availability;
CREATE TRIGGER update_clinic_availability_updated_at BEFORE UPDATE
    ON clinic_availability FOR EACH ROW EXECUTE FUNCTION update_clinic_availability_updated_at_column();

CREATE OR REPLACE FUNCTION update_blocked_time_slots_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blocked_time_slots_updated_at ON blocked_time_slots;
CREATE TRIGGER update_blocked_time_slots_updated_at BEFORE UPDATE
    ON blocked_time_slots FOR EACH ROW EXECUTE FUNCTION update_blocked_time_slots_updated_at_column();
