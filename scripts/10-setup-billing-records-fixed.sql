-- Billing Records Management System (Fixed Version)
-- This script sets up comprehensive billing and payment tracking

-- Create billing_records table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
    
    -- Bill details
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    -- Use created_at instead of bill_date since bill_date doesn't exist in current schema
    
    -- Financial information
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        discount_amount >= 0 AND 
        total_amount >= 0 AND 
        paid_amount >= 0 AND 
        balance_amount >= 0
    ),
    CONSTRAINT valid_balance CHECK (balance_amount = total_amount - paid_amount)
);

-- Create billing_items table for itemized billing (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Metadata
    item_type VARCHAR(50) DEFAULT 'service',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_billing_values CHECK (
        quantity > 0 AND 
        unit_price >= 0 AND 
        total_price >= 0
    ),
    CONSTRAINT valid_total_price CHECK (total_price = quantity * unit_price)
);

-- Create payment_records table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    
    -- Payment details
    -- Use created_at instead of payment_date for consistency
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    
    -- Status and notes
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_billing_records_patient_id ON billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_created_at ON billing_records(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_items_billing_record_id ON billing_items(billing_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_billing_record_id ON payment_records(billing_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_date ON payment_records(payment_date);

-- Function to generate unique bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current year and month
    new_number := 'BILL-' || TO_CHAR(NOW(), 'YYYY-MM') || '-';
    
    -- Get the next sequential number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM LENGTH(new_number) + 1) AS INTEGER)), 0) + 1
    INTO counter
    FROM billing_records
    WHERE bill_number LIKE new_number || '%';
    
    -- Format with leading zeros
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_bill_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_bill_number() TO service_role;
