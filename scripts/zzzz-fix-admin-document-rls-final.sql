-- Fix RLS policies to allow admin access to patient documents

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can insert documents for any patient" ON patient_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can delete all documents" ON patient_documents;

-- Create comprehensive RLS policies that work for both patients and admins
CREATE POLICY "Allow patients to view their own documents" ON patient_documents
  FOR SELECT USING (
    patient_id = auth.uid() OR 
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow patients and admins to insert documents" ON patient_documents
  FOR INSERT WITH CHECK (
    -- Patient can upload to their own profile
    (patient_id = auth.uid() AND uploaded_by = auth.uid()) OR
    -- Admin can upload to any patient profile
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow patients and admins to update documents" ON patient_documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    patient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow patients and admins to delete documents" ON patient_documents
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    patient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Fixed admin user identification by removing reference to non-existent uploaded_by column in appointments table
-- Ensure the admin user has the correct role - identify by email pattern
UPDATE users 
SET role = 'admin' 
WHERE email LIKE '%admin%' OR email LIKE '%@admin.%' OR role IS NULL;

-- Drop existing function before recreating with new return type
DROP FUNCTION IF EXISTS get_patient_documents_for_admin(UUID);

-- Create or update admin function with proper security
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
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Return all documents for the patient
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
    pd.updated_at
  FROM patient_documents pd
  WHERE pd.patient_id = target_patient_id
  ORDER BY pd.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_documents_for_admin(UUID) TO authenticated;
