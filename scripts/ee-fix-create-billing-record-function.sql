-- Fix create_billing_record function to match the exact parameters being called by the application
-- The application is calling: create_billing_record(p_appointment_id, p_created_by, p_description, p_notes, p_payment_method)

-- Drop existing function with conflicting signatures
DROP FUNCTION IF EXISTS create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_billing_record(UUID, UUID, TEXT, TEXT, TEXT);

-- Create the function with the exact signature that the application is calling
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
    patient_id_var UUID;
    current_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get patient_id from appointment
    SELECT patient_id INTO patient_id_var
    FROM appointments
    WHERE id = p_appointment_id;
    
    -- If no appointment found, raise error
    IF patient_id_var IS NULL THEN
        RAISE EXCEPTION 'Appointment not found with ID: %', p_appointment_id;
    END IF;
    
    -- Handle created_by parameter with fallbacks
    current_user_id := COALESCE(p_created_by, auth.uid());
    
    -- If still no user, try to get an admin user as fallback
    IF current_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1;
        current_user_id := admin_user_id;
    END IF;

    -- Insert billing record with default amount of 0 (will be updated later)
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
        patient_id_var,
        p_appointment_id,
        p_description,
        0, -- Default amount, will be updated by the application
        p_payment_method,
        p_notes,
        current_user_id,
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_billing_record(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

-- Also create the original function signature that other parts of the code might use
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
    -- Handle created_by parameter with fallbacks
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
        current_user_id,
        'pending'
    ) RETURNING id INTO billing_id;

    RETURN billing_id;
END;
$$;

-- Grant execute permissions for the overloaded function
GRANT EXECUTE ON FUNCTION create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_billing_record(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT, UUID) TO service_role;
