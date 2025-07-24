-- Create appointment_types table
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common dental appointment types
INSERT INTO appointment_types (name, duration_minutes, description) VALUES
('General Checkup', 30, 'Routine dental examination and cleaning'),
('Teeth Cleaning', 45, 'Professional dental cleaning and polishing'),
('Dental Filling', 60, 'Treatment for cavities and tooth restoration'),
('Root Canal', 90, 'Endodontic treatment for infected tooth pulp'),
('Tooth Extraction', 45, 'Surgical removal of damaged or problematic teeth'),
('Crown Placement', 75, 'Installation of dental crown for tooth protection'),
('Orthodontic Consultation', 30, 'Initial consultation for braces or aligners'),
('Teeth Whitening', 60, 'Professional teeth whitening treatment'),
('Dental Implant', 120, 'Surgical placement of dental implant'),
('Emergency Visit', 30, 'Urgent dental care for pain or trauma'),
('Periodontal Treatment', 60, 'Treatment for gum disease and periodontal issues'),
('Oral Surgery', 90, 'Various oral surgical procedures')
ON CONFLICT (name) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointment_types_name ON appointment_types(name);
