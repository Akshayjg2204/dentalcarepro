-- Additional script to ensure storage policies work correctly
-- This script can be run if there are still issues with document uploads

-- Drop and recreate the upload policy with better permissions
DROP POLICY IF EXISTS "Authenticated users can upload patient documents" ON storage.objects;

-- More permissive upload policy for authenticated users
CREATE POLICY "Authenticated users can upload patient documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL
);

-- Ensure staff can upload documents for any patient
CREATE POLICY "Staff can upload documents for patients" 
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'doctor', 'staff')
  )
);

-- Update the view policy to be more flexible
DROP POLICY IF EXISTS "Staff can view all patient documents" ON storage.objects;

CREATE POLICY "Staff can view all patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  (
    -- User can view their own uploads
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Staff can view all documents
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'doctor', 'staff')
    )
  )
);

-- Update delete policy to be more flexible
DROP POLICY IF EXISTS "Staff can delete patient documents" ON storage.objects;

CREATE POLICY "Staff can delete patient documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  (
    -- User can delete their own uploads
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Staff can delete any document
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'doctor', 'staff')
    )
  )
);
