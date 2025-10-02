-- Fix billing records schema to match application expectations
-- This script ensures the billing_records table has the correct structure

-- Drop existing billing_records table if it exists
DROP TABLE IF EXISTS billing_records CASCADE;

-- Create billing_records table with correct structure
CREATE TABLE billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'insurance', 'other')),
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_billing_records_patient_id ON billing_records(patient_id);
CREATE INDEX idx_billing_records_appointment_id ON billing_records(appointment_id);
CREATE INDEX idx_billing_records_status ON billing_records(status);
CREATE INDEX idx_billing_records_created_at ON billing_records(created_at);

-- Enable RLS
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own billing records" ON billing_records
    FOR SELECT USING (
        patient_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can insert billing records" ON billing_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can update billing records" ON billing_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can delete billing records" ON billing_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_billing_records_updated_at
    BEFORE UPDATE ON billing_records
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_records_updated_at();

-- Grant permissions
GRANT ALL ON billing_records TO authenticated;
GRANT ALL ON billing_records TO service_role;
GRANT SELECT ON billing_records TO anon;

-- Create function to create billing record
CREATE OR REPLACE FUNCTION create_billing_record(
    p_patient_id UUID,
    p_appointment_id UUID,
    p_description TEXT,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    billing_id UUID;
BEGIN
    -- Insert billing record
    INSERT INTO billing_records (
        patient_id,
        appointment_id,
        description,
        amount,
        payment_method,
        notes,
        created_by,
        status
    ) VALUES (
        p_patient_id,
        p_appointment_id,
        p_description,
        p_amount,
        p_payment_method,
        p_notes,
        auth.uid(),
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;

-- Create function to update billing record payment
CREATE OR REPLACE FUNCTION update_billing_payment(
    p_billing_id UUID,
    p_payment_method TEXT,
    p_status TEXT DEFAULT 'paid'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE billing_records 
    SET 
        payment_method = p_payment_method,
        status = p_status,
        payment_date = CASE WHEN p_status = 'paid' THEN NOW() ELSE payment_date END,
        updated_at = NOW()
    WHERE id = p_billing_id;

    RETURN FOUND;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_billing_payment TO authenticated;
GRANT EXECUTE ON FUNCTION update_billing_payment TO service_role;

-- Create view for billing records with patient info
CREATE OR REPLACE VIEW billing_records_with_patient AS
SELECT 
    br.*,
    u.first_name || ' ' || u.last_name as patient_name,
    u.email as patient_email,
    u.phone as patient_phone
FROM billing_records br
JOIN users u ON br.patient_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON billing_records_with_patient TO authenticated;
GRANT SELECT ON billing_records_with_patient TO service_role;

-- Create RLS policy for the view
ALTER VIEW billing_records_with_patient SET (security_invoker = true);
