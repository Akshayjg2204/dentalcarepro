-- Fix the created_by foreign key constraint issue
-- Update the create_billing_record function to handle invalid user IDs

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
    -- Get patient_id and amount from appointment
    SELECT patient_id INTO v_patient_id
    FROM appointments
    WHERE id = p_appointment_id;
    
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Appointment not found with ID: %', p_appointment_id;
    END IF;
    
    -- Set default amount (can be updated later)
    v_amount := 0.00;
    
    -- Handle created_by foreign key constraint
    -- Try to find a valid user ID for created_by
    v_created_by := p_created_by;
    
    -- If the provided created_by doesn't exist in users table, try auth.uid()
    IF v_created_by IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = v_created_by) THEN
        v_created_by := auth.uid();
    END IF;
    
    -- If auth.uid() also doesn't exist, find the first admin user
    IF v_created_by IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = v_created_by) THEN
        SELECT id INTO v_created_by 
        FROM users 
        WHERE role = 'admin' 
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- If still no valid user found, set to NULL (allowed by schema)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_created_by) THEN
        v_created_by := NULL;
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record TO service_role;
