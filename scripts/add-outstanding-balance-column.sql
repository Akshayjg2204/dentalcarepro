-- Add outstanding_balance column to payments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE payments ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Update existing records to calculate outstanding_balance
UPDATE payments 
SET outstanding_balance = COALESCE(bill_amount, 0) - COALESCE(paid_amount, 0)
WHERE outstanding_balance IS NULL OR outstanding_balance = 0;
