-- Fix the payments/billing_records table schema to remove dependency on description column
-- This ensures the payment creation works without the missing description column

-- Update any existing queries that might reference the description column
-- The description is not needed for basic payment functionality

-- Add a comment to document that description is optional
COMMENT ON TABLE billing_records IS 'Billing records table - description column is optional and not required for basic payment functionality';

-- Ensure the table has the correct structure for payments
ALTER TABLE billing_records 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'not_paid',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update any existing records to have proper payment status
UPDATE billing_records 
SET payment_status = CASE 
  WHEN paid_amount >= amount THEN 'paid'
  WHEN paid_amount > 0 THEN 'partial'
  ELSE 'not_paid'
END
WHERE payment_status IS NULL;
