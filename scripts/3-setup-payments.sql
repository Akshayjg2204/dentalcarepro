-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'fully_paid', 'partial_paid', 'not_paid')),
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  treatment_type VARCHAR(100),
  doctor_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for payments table
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for payments
CREATE OR REPLACE FUNCTION update_payments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE
    ON payments FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
