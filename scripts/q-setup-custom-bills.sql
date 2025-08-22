-- Create custom_bills table for standalone bills not tied to appointments
CREATE TABLE IF NOT EXISTS custom_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_name VARCHAR(255) NOT NULL,
  bill_date DATE NOT NULL,
  bill_amount DECIMAL(10,2) NOT NULL CHECK (bill_amount >= 0),
  paid_amount DECIMAL(10,2) DEFAULT 0 CHECK (paid_amount >= 0),
  payment_method VARCHAR(50),
  assigned_to VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_bills_patient_id ON custom_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_custom_bills_bill_date ON custom_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_custom_bills_created_by ON custom_bills(created_by);

-- Add RLS policies
ALTER TABLE custom_bills ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view custom bills
CREATE POLICY "Users can view custom bills" ON custom_bills
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert custom bills
CREATE POLICY "Users can create custom bills" ON custom_bills
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update custom bills
CREATE POLICY "Users can update custom bills" ON custom_bills
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add constraint to ensure paid amount doesn't exceed bill amount
ALTER TABLE custom_bills ADD CONSTRAINT check_paid_amount_not_exceeds_bill 
  CHECK (paid_amount <= bill_amount);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_custom_bills_updated_at
  BEFORE UPDATE ON custom_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_bills_updated_at();
