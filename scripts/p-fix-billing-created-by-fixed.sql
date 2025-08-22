-- Fix billing record creation to handle auth issues
-- This script fixes the foreign key constraint violation for created_by field

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT);

-- Create or replace the billing record creation function with proper error handling
CREATE OR REPLACE FUNCTION create_billing_record(
    p_patient_id UUID,
    p_appointment_id UUID,
    p_description TEXT,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    billing_id UUID;
    current_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Try to get current user ID, fallback to passed parameter or admin user
    current_user_id := COALESCE(p_created_by, auth.uid());
    
    -- If still no user, try to get an admin user as fallback
    IF current_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1;
        current_user_id := admin_user_id;
    END IF;

    -- Insert billing record
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
        p_patient_id,
        p_appointment_id,
        p_description,
        p_amount,
        p_payment_method,
        p_notes,
        current_user_id, -- This can be NULL if no valid user found
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;

-- Update the billing record creation function for treatments
CREATE OR REPLACE FUNCTION create_billing_record_for_treatment(
    p_patient_id UUID,
    p_appointment_id UUID,
    p_description TEXT,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN create_billing_record(
        p_patient_id,
        p_appointment_id,
        p_description,
        p_amount,
        p_payment_method,
        p_notes,
        p_created_by
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_billing_record_for_treatment TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record_for_treatment TO service_role;
