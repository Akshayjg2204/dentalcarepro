-- Create auth cleanup functions to handle user management

-- Function to safely delete a user and all related data
CREATE OR REPLACE FUNCTION delete_user_completely(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    result BOOLEAN := FALSE;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE email = user_email;
    
    IF user_record.id IS NOT NULL THEN
        -- Delete from related tables first (to avoid foreign key constraints)
        DELETE FROM patient_treatments WHERE patient_id = user_record.id;
        DELETE FROM patient_medical_records WHERE patient_id = user_record.id;
        DELETE FROM medical_history_updates WHERE patient_id = user_record.id OR updated_by = user_record.id;
        DELETE FROM payments WHERE patient_id = user_record.id;
        DELETE FROM appointments WHERE patient_id = user_record.id OR doctor_id = user_record.id OR staff_id = user_record.id;
        DELETE FROM leads WHERE assigned_to = user_record.id OR assigned_doctor = user_record.id OR assigned_staff = user_record.id;
        
        -- Delete from users table
        DELETE FROM users WHERE id = user_record.id;
        
        -- Delete from auth.users if exists
        DELETE FROM auth.users WHERE email = user_email;
        
        result := TRUE;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile safely
CREATE OR REPLACE FUNCTION create_user_profile_safe(
    user_email TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_role TEXT DEFAULT 'patient',
    user_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id FROM users WHERE email = user_email;
    
    IF existing_user_id IS NOT NULL THEN
        RETURN existing_user_id;
    END IF;
    
    -- Create new user
    INSERT INTO users (email, first_name, last_name, role, phone)
    VALUES (user_email, user_first_name, user_last_name, user_role, user_phone)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
EXCEPTION
    WHEN unique_violation THEN
        -- If there's a race condition, try to get the existing user
        SELECT id INTO existing_user_id FROM users WHERE email = user_email;
        RETURN existing_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
