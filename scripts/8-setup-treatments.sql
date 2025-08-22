-- Create treatments table
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_cost DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 30,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'treatments_name_unique'
    ) THEN
        ALTER TABLE treatments ADD CONSTRAINT treatments_name_unique UNIQUE (name);
    END IF;
END $$;

-- Create patient_treatments table for tracking treatments given to patients
CREATE TABLE IF NOT EXISTS patient_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cost DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'planned',
    notes TEXT,
    treatment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'patient_treatments_status_check'
    ) THEN
        ALTER TABLE patient_treatments 
        ADD CONSTRAINT patient_treatments_status_check 
        CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'));
    END IF;
END $$;

-- Insert default treatments only if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM treatments LIMIT 1) THEN
        INSERT INTO treatments (name, description, default_cost, duration_minutes, category) VALUES
        ('Dental Cleaning', 'Regular dental cleaning and checkup', 150.00, 60, 'Preventive'),
        ('Tooth Filling', 'Cavity filling with composite material', 200.00, 45, 'Restorative'),
        ('Root Canal', 'Root canal treatment for infected tooth', 800.00, 90, 'Endodontic'),
        ('Tooth Extraction', 'Simple tooth extraction', 300.00, 30, 'Oral Surgery'),
        ('Crown Placement', 'Dental crown installation', 1200.00, 60, 'Restorative'),
        ('Teeth Whitening', 'Professional teeth whitening treatment', 400.00, 45, 'Cosmetic'),
        ('Dental Implant', 'Single tooth implant placement', 2500.00, 120, 'Oral Surgery'),
        ('Orthodontic Consultation', 'Initial consultation for braces/aligners', 100.00, 30, 'Orthodontic'),
        ('Gum Treatment', 'Periodontal therapy for gum disease', 500.00, 75, 'Periodontic'),
        ('Emergency Visit', 'Emergency dental consultation', 200.00, 30, 'Emergency');
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_treatments_patient_id ON patient_treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_appointment_id ON patient_treatments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_doctor_id ON patient_treatments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(category);
