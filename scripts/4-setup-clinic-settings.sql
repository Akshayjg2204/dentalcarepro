-- Create clinic_settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name TEXT NOT NULL DEFAULT 'Dental Clinic',
  clinic_subtitle TEXT DEFAULT 'Professional Dental Care',
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  postal_code VARCHAR(20),
  country TEXT DEFAULT 'India',
  website TEXT,
  google_maps_link TEXT,
  
  -- Working Hours
  monday_open TIME,
  monday_close TIME,
  tuesday_open TIME,
  tuesday_close TIME,
  wednesday_open TIME,
  wednesday_close TIME,
  thursday_open TIME,
  thursday_close TIME,
  friday_open TIME,
  friday_close TIME,
  saturday_open TIME,
  saturday_close TIME,
  sunday_open TIME,
  sunday_close TIME,
  working_hours JSONB,
  
  -- Additional Settings
  appointment_duration INTEGER DEFAULT 30,
  emergency_phone TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Social Media
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  facebook VARCHAR(255),
  instagram VARCHAR(255),
  twitter VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default clinic settings
INSERT INTO clinic_settings (
  clinic_name,
  clinic_subtitle,
  phone,
  email,
  address,
  city,
  state,
  zip_code,
  description,
  monday_open, monday_close,
  tuesday_open, tuesday_close,
  wednesday_open, wednesday_close,
  thursday_open, thursday_close,
  friday_open, friday_close,
  saturday_open, saturday_close,
  emergency_phone,
  google_maps_link
) VALUES (
  'SHREE MULTISPECIALITY DENTAL CLINIC',
  'Best Dentist in KoparKhairne',
  '+91 98765 43210',
  'info@dentalcare.com',
  'Shop No. 123, Sector 10',
  'Kopar Khairane',
  'Maharashtra',
  '400709',
  'Experience world-class dental care with our team of expert dentists. We provide comprehensive, gentle, and personalized treatment for the whole family.',
  '09:00:00', '18:00:00',
  '09:00:00', '18:00:00',
  '09:00:00', '18:00:00',
  '09:00:00', '18:00:00',
  '09:00:00', '18:00:00',
  '09:00:00', '14:00:00',
  '+91 98765 43210',
  'https://maps.google.com/?q=Shree+Multispeciality+Dental+Clinic+Kopar+Khairane'
) ON CONFLICT DO NOTHING;

-- Disable RLS for clinic_settings table
ALTER TABLE clinic_settings DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for clinic_settings
CREATE OR REPLACE FUNCTION update_clinic_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clinic_settings_updated_at ON clinic_settings;
CREATE TRIGGER update_clinic_settings_updated_at BEFORE UPDATE
    ON clinic_settings FOR EACH ROW EXECUTE FUNCTION update_clinic_settings_updated_at_column();
