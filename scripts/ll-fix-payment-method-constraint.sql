-- Fix payment_method check constraint to match application form values
-- This script updates the billing_records table constraint to allow all payment methods used in the forms

-- Drop the existing constraint
ALTER TABLE billing_records DROP CONSTRAINT IF EXISTS billing_records_payment_method_check;

-- Add the updated constraint with all payment methods used in the application
ALTER TABLE billing_records ADD CONSTRAINT billing_records_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'insurance', 'other'));

-- Also update any custom_bills table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_bills') THEN
        -- Drop existing constraint on custom_bills
        ALTER TABLE custom_bills DROP CONSTRAINT IF EXISTS custom_bills_payment_method_check;
        
        -- Add updated constraint
        ALTER TABLE custom_bills ADD CONSTRAINT custom_bills_payment_method_check 
        CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'insurance', 'other'));
    END IF;
END $$;

-- Update the create_billing_record function to handle all payment methods
CREATE OR REPLACE FUNCTION create_billing_record(
    p_patient_id UUID,
    p_amount NUMERIC,
    p_appointment_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_description TEXT DEFAULT '',
    p_notes TEXT DEFAULT '',
    p_payment_method TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_record_id UUID;
BEGIN
    -- Validate payment method if provided
    IF p_payment_method IS NOT NULL AND p_payment_method != '' THEN
        IF p_payment_method NOT IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'insurance', 'other') THEN
            RAISE EXCEPTION 'Invalid payment method: %. Allowed values are: cash, card, upi, bank_transfer, cheque, insurance, other', p_payment_method;
        END IF;
    END IF;

    -- Insert the billing record
    INSERT INTO billing_records (
        patient_id,
        amount,
        appointment_id,
        created_by,
        description,
        notes,
        payment_method,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_patient_id,
        p_amount,
        p_appointment_id,
        COALESCE(p_created_by, auth.uid()),
        COALESCE(p_description, 'Billing record'),
        p_notes,
        NULLIF(p_payment_method, ''),
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO new_record_id;

    RETURN new_record_id;
END;
$$;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;

-- Log the successful update
DO $$
BEGIN
    RAISE NOTICE 'Payment method constraints updated successfully. Allowed values: cash, card, upi, bank_transfer, cheque, insurance, other';
END $$;
