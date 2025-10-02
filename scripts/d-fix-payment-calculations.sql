-- Fix payment calculations and ensure data consistency

-- Update existing records with calculated values
UPDATE payments 
SET 
    total_amount = COALESCE(bill_amount, 0),
    amount_paid = COALESCE(paid_amount, 0),
    outstanding_balance = COALESCE(bill_amount, 0) - COALESCE(paid_amount, 0),
    payment_status = CASE 
        WHEN COALESCE(paid_amount, 0) >= COALESCE(bill_amount, 0) AND COALESCE(bill_amount, 0) > 0 THEN 'paid'
        WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
        ELSE 'pending'
    END
WHERE total_amount IS NULL OR total_amount = 0 OR outstanding_balance IS NULL;

-- Create function to automatically calculate payment fields
CREATE OR REPLACE FUNCTION calculate_payment_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Set total_amount from bill_amount if not provided
    IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
        NEW.total_amount = COALESCE(NEW.bill_amount, 0);
    END IF;
    
    -- Set amount_paid from paid_amount if not provided
    IF NEW.amount_paid IS NULL OR NEW.amount_paid = 0 THEN
        NEW.amount_paid = COALESCE(NEW.paid_amount, 0);
    END IF;
    
    -- Calculate outstanding balance
    NEW.outstanding_balance = COALESCE(NEW.total_amount, NEW.bill_amount, 0) - COALESCE(NEW.amount_paid, NEW.paid_amount, 0);
    
    -- Set payment status based on amounts
    IF NEW.outstanding_balance <= 0 AND COALESCE(NEW.total_amount, NEW.bill_amount, 0) > 0 THEN
        NEW.payment_status = 'paid';
    ELSIF COALESCE(NEW.amount_paid, NEW.paid_amount, 0) > 0 THEN
        NEW.payment_status = 'partial';
    ELSE
        NEW.payment_status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic payment calculations
DROP TRIGGER IF EXISTS calculate_payment_fields_trigger ON payments;
CREATE TRIGGER calculate_payment_fields_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION calculate_payment_fields();
