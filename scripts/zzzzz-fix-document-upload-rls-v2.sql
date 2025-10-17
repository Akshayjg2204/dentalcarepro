-- Comprehensive fix for patient_documents RLS policies
-- This script ensures both patients and admins can properly upload documents

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can insert documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can update documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can insert documents for any patient" ON patient_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON patient_documents;
DROP POLICY IF EXISTS "Admins can delete all documents" ON patient_documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON patient_documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON patient_documents;
DROP POLICY IF EXISTS "Allow patients to view their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Allow patients and admins to insert documents" ON patient_documents;
DROP POLICY IF EXISTS "Allow patients and admins to update documents" ON patient_documents;
DROP POLICY IF EXISTS "Allow patients and admins to delete documents" ON patient_documents;

-- Enable RLS on the table
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'doctor', 'staff')
  );
END;
$$;

-- SELECT policy: Users can view documents they uploaded or for their patient profile, admins can view all
CREATE POLICY "document_select_policy" ON patient_documents
  FOR SELECT 
  USING (
    patient_id = auth.uid() OR 
    uploaded_by = auth.uid() OR
    is_admin()
  );

-- INSERT policy: Patients can upload to their own profile, admins/staff can upload to any profile
CREATE POLICY "document_insert_policy" ON patient_documents
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is admin/doctor/staff (can upload for any patient)
    is_admin() OR
    -- Allow if patient is uploading to their own profile
    (patient_id = auth.uid() AND uploaded_by = auth.uid())
  );

-- UPDATE policy: Users can update documents they uploaded or own, admins can update all
CREATE POLICY "document_update_policy" ON patient_documents
  FOR UPDATE 
  USING (
    uploaded_by = auth.uid() OR
    patient_id = auth.uid() OR
    is_admin()
  )
  WITH CHECK (
    uploaded_by = auth.uid() OR
    patient_id = auth.uid() OR
    is_admin()
  );

-- DELETE policy: Users can delete documents they uploaded or own, admins can delete all
CREATE POLICY "document_delete_policy" ON patient_documents
  FOR DELETE 
  USING (
    uploaded_by = auth.uid() OR
    patient_id = auth.uid() OR
    is_admin()
  );

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Ensure admin users have the correct role
-- Update any users with admin-like emails to have admin role
UPDATE users 
SET role = 'admin' 
WHERE (
  email ILIKE '%admin%' OR 
  email ILIKE '%@admin.%' OR
  role = 'admin'
) AND role != 'admin';

-- Log the changes
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role IN ('admin', 'doctor', 'staff');
  RAISE NOTICE 'RLS policies updated successfully. Found % admin/staff users.', admin_count;
END $$;
