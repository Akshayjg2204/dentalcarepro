-- Fix the created_by foreign key constraint issue in billing records
-- Make created_by optional and handle cases where auth.uid() doesn't match users table

-- Update the create_billing_record function to make created_by optional
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
BEGIN
    -- Try to get a valid user ID for created_by
    -- First try the passed parameter, then auth.uid(), then find an admin user
    current_user_id := p_created_by;
    
    IF current_user_id IS NULL THEN
        current_user_id := auth.uid();
    END IF;
    
    -- If auth.uid() doesn't exist in users table, use the first admin user
    IF current_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = current_user_id) THEN
        SELECT id INTO current_user_id 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1;
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
        current_user_id,
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;
