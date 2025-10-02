-- Create patient_medical_records table
CREATE TABLE IF NOT EXISTS patient_medical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Medical History
  allergies TEXT,
  current_medications TEXT,
  medical_conditions TEXT,
  previous_surgeries TEXT,
  family_medical_history TEXT,
  
  -- Dental History
  previous_dental_work TEXT,
  dental_concerns TEXT,
  last_dental_visit DATE,
  dental_insurance_provider TEXT,
  dental_insurance_number TEXT,
  
  -- Emergency Contact (additional to user table)
  emergency_contact_relationship TEXT,
  
  -- Lifestyle
  smoking_status TEXT CHECK (smoking_status IN ('never', 'former', 'current')),
  alcohol_consumption TEXT CHECK (alcohol_consumption IN ('none', 'occasional', 'moderate', 'heavy')),
  exercise_frequency TEXT,
  
  -- Additional Info
  preferred_appointment_time TEXT,
  special_needs TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(patient_id)
);

-- Create medical_history_updates table for tracking changes
CREATE TABLE IF NOT EXISTS medical_history_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  update_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for these tables
ALTER TABLE patient_medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history_updates DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for patient_medical_records
CREATE OR REPLACE FUNCTION update_patient_medical_records_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_patient_medical_records_updated_at ON patient_medical_records;
CREATE TRIGGER update_patient_medical_records_updated_at BEFORE UPDATE
    ON patient_medical_records FOR EACH ROW EXECUTE FUNCTION update_patient_medical_records_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_medical_records_patient_id ON patient_medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_updates_patient_id ON medical_history_updates(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_updates_updated_by ON medical_history_updates(updated_by);
