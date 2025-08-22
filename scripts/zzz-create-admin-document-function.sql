-- Create RPC function to allow admins to view patient documents
CREATE OR REPLACE FUNCTION get_patient_documents_for_admin(target_patient_id UUID)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  uploaded_by UUID,
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  document_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  uploader_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM users 
  WHERE id = auth.uid();
  
  -- Only allow admins to use this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Return patient documents with uploader information
  RETURN QUERY
  SELECT 
    pd.id,
    pd.patient_id,
    pd.uploaded_by,
    pd.file_name,
    pd.file_path,
    pd.file_size,
    pd.file_type,
    pd.document_type,
    pd.description,
    pd.created_at,
    pd.updated_at,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as uploader_name
  FROM patient_documents pd
  LEFT JOIN users u ON pd.uploaded_by = u.id
  WHERE pd.patient_id = target_patient_id
  ORDER BY pd.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_documents_for_admin(UUID) TO authenticated;
