-- First, let's check what columns exist in the payments table
-- and add the missing ones

-- Add missing columns to payments table if they don't exist
DO $$ 
BEGIN
    -- Add total_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'total_amount') THEN
        ALTER TABLE payments ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add amount_paid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount_paid') THEN
        ALTER TABLE payments ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add outstanding_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE payments ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_status') THEN
        ALTER TABLE payments ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
        ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50);
    END IF;
    
    -- Add payment_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_date') THEN
        ALTER TABLE payments ADD COLUMN payment_date DATE;
    END IF;
    
    -- Add treatment_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'treatment_type') THEN
        ALTER TABLE payments ADD COLUMN treatment_type VARCHAR(100);
    END IF;
    
    -- Add doctor_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'doctor_name') THEN
        ALTER TABLE payments ADD COLUMN doctor_name VARCHAR(100);
    END IF;
END $$;

-- Update existing records with calculated values
UPDATE payments 
SET 
    total_amount = COALESCE(bill_amount, 0),
    amount_paid = COALESCE(paid_amount, 0),
    outstanding_balance = COALESCE(bill_amount, 0) - COALESCE(paid_amount, 0),
    payment_status = CASE 
        WHEN COALESCE(paid_amount, 0) >= COALESCE(bill_amount, 0) THEN 'paid'
        WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
        ELSE 'pending'
    END
WHERE total_amount IS NULL OR total_amount = 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
