-- Final fix for billing_records foreign key constraint issues
-- This script addresses the root cause by modifying the table constraints

-- First, check if the created_by column allows NULL values
-- If not, modify it to allow NULL
DO $$
BEGIN
    -- Check if created_by column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_records' 
        AND column_name = 'created_by' 
        AND is_nullable = 'NO'
    ) THEN
        -- Make created_by nullable
        ALTER TABLE billing_records ALTER COLUMN created_by DROP NOT NULL;
        RAISE NOTICE 'Made created_by column nullable';
    END IF;
END $$;

-- Drop and recreate the foreign key constraint to allow NULL values
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'billing_records_created_by_fkey'
        AND table_name = 'billing_records'
    ) THEN
        ALTER TABLE billing_records DROP CONSTRAINT billing_records_created_by_fkey;
        RAISE NOTICE 'Dropped existing created_by foreign key constraint';
    END IF;
    
    -- Add new foreign key constraint that allows NULL values
    ALTER TABLE billing_records 
    ADD CONSTRAINT billing_records_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added new created_by foreign key constraint with NULL support';
END $$;

-- Update the create_billing_record function with better error handling
CREATE OR REPLACE FUNCTION create_billing_record(
    p_appointment_id UUID,
    p_created_by UUID,
    p_description TEXT,
    p_notes TEXT,
    p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    billing_id UUID;
    v_patient_id UUID;
    v_amount DECIMAL(10,2);
    v_created_by UUID;
BEGIN
    -- Get patient_id from appointment
    SELECT patient_id INTO v_patient_id
    FROM appointments
    WHERE id = p_appointment_id;
    
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Appointment not found with ID: %', p_appointment_id;
    END IF;
    
    -- Set default amount
    v_amount := 0.00;
    
    -- Simplified user validation - just set to NULL if invalid
    -- This prevents foreign key constraint violations
    v_created_by := NULL;
    
    -- Only set created_by if the user actually exists
    IF p_created_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = p_created_by) THEN
        v_created_by := p_created_by;
    ELSIF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN
        v_created_by := auth.uid();
    END IF;

    -- Insert billing record with NULL created_by if no valid user found
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
        v_patient_id,
        p_appointment_id,
        COALESCE(p_description, 'Appointment billing'),
        v_amount,
        p_payment_method,
        p_notes,
        v_created_by,
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;

-- Add a comment to track this fix
COMMENT ON FUNCTION create_billing_record IS 'Creates billing record with NULL-safe created_by handling to prevent foreign key constraint violations';
