-- Fix admin access to patient documents by ensuring proper role assignment and debugging RLS

-- First, let's check and fix the admin user role
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@dentalcare.com' OR id = '4b388abf-9042-42b8-b734-b74d34fe0744';

-- Create a function to debug document access issues
CREATE OR REPLACE FUNCTION debug_document_access(patient_uuid UUID)
RETURNS TABLE (
    current_user_id UUID,
    current_user_role TEXT,
    patient_id UUID,
    document_count BIGINT,
    can_access_as_admin BOOLEAN,
    auth_uid UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as current_user_id,
        u.role as current_user_role,
        patient_uuid as patient_id,
        (SELECT COUNT(*) FROM patient_documents WHERE patient_documents.patient_id = patient_uuid) as document_count,
        (u.role IN ('admin', 'doctor', 'staff')) as can_access_as_admin,
        auth.uid() as auth_uid
    FROM users u 
    WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_document_access(UUID) TO authenticated;

-- Also create a simpler function to check if current user can access patient documents
CREATE OR REPLACE FUNCTION can_access_patient_documents(patient_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (
            users.id = patient_uuid OR
            users.role IN ('admin', 'doctor', 'staff')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_patient_documents(UUID) TO authenticated;

-- Let's also ensure the RLS policies are correctly applied by recreating them
DROP POLICY IF EXISTS "Authenticated users can view documents" ON patient_documents;

CREATE POLICY "Authenticated users can view documents" ON patient_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            -- User can view their own documents
            auth.uid() = patient_id OR 
            -- User can view documents they uploaded
            auth.uid() = uploaded_by OR
            -- Admin/Doctor/Staff can view all documents
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            )
        )
    );

-- Add some debug logging to help identify issues
-- Create a function that logs document access attempts
CREATE OR REPLACE FUNCTION log_document_access_attempt(patient_uuid UUID, operation TEXT)
RETURNS VOID AS $$
BEGIN
    -- This will help us debug in the logs
    RAISE NOTICE 'Document access attempt: User % trying % operation for patient %, User role: %', 
        auth.uid(), 
        operation, 
        patient_uuid,
        (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_document_access_attempt(UUID, TEXT) TO authenticated;
