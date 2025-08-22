-- Create RPC function to handle document creation with proper authentication
CREATE OR REPLACE FUNCTION create_patient_document(
    p_patient_id UUID,
    p_uploaded_by UUID,
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_size BIGINT,
    p_file_type TEXT,
    p_document_type TEXT DEFAULT 'general',
    p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    document_id UUID;
    current_user_id UUID;
    user_role TEXT;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = current_user_id;
    
    -- Check permissions: user must be uploading for themselves or be admin/doctor/staff
    IF current_user_id != p_uploaded_by THEN
        RAISE EXCEPTION 'Cannot upload documents on behalf of another user';
    END IF;
    
    IF current_user_id != p_patient_id AND user_role NOT IN ('admin', 'doctor', 'staff') THEN
        RAISE EXCEPTION 'Insufficient permissions to upload documents for this patient';
    END IF;
    
    -- Insert the document record
    INSERT INTO patient_documents (
        patient_id,
        uploaded_by,
        file_name,
        file_path,
        file_size,
        file_type,
        document_type,
        description
    ) VALUES (
        p_patient_id,
        p_uploaded_by,
        p_file_name,
        p_file_path,
        p_file_size,
        p_file_type,
        p_document_type,
        p_description
    ) RETURNING id INTO document_id;
    
    RETURN document_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_patient_document TO authenticated;
