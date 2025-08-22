-- Create custom_bills table for patient billing
CREATE TABLE IF NOT EXISTS custom_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bill_name TEXT NOT NULL,
    bill_date DATE NOT NULL,
    bill_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque')),
    assigned_to TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        bill_amount >= 0 AND 
        paid_amount >= 0 AND
        paid_amount <= bill_amount
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_bills_patient_id ON custom_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_custom_bills_bill_date ON custom_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_custom_bills_created_by ON custom_bills(created_by);

-- Enable RLS
ALTER TABLE custom_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own custom bills" ON custom_bills
    FOR SELECT USING (
        patient_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can insert custom bills" ON custom_bills
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can update custom bills" ON custom_bills
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

CREATE POLICY "Staff can delete custom bills" ON custom_bills
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_custom_bills_updated_at
    BEFORE UPDATE ON custom_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_bills_updated_at();

-- Grant permissions
GRANT ALL ON custom_bills TO authenticated;
GRANT ALL ON custom_bills TO service_role;
GRANT SELECT ON custom_bills TO anon;
