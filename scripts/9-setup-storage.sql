-- Setup storage for patient documents
-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient-documents',
    'patient-documents',
    false,
    52428800, -- 50MB limit
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies more comprehensively to avoid conflicts
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage all documents" ON storage.objects;

-- Create storage policies for patient-documents bucket
-- Upload policy - users can upload to their own folder or admins can upload anywhere
CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'patient-documents' AND (
            -- Users can upload to their own folder
            (storage.foldername(name))[1] = auth.uid()::text OR
            -- Admins can upload anywhere
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            )
        )
    );

-- Select policy - users can view their own documents or documents they have access to
CREATE POLICY "Users can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'patient-documents' AND (
            -- Users can view their own documents
            (storage.foldername(name))[1] = auth.uid()::text OR
            -- Admins, doctors, and staff can view all documents
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            ) OR
            -- Users can view documents where they are the patient or uploader
            EXISTS (
                SELECT 1 FROM patient_documents pd
                WHERE pd.file_path = name
                AND (pd.patient_id = auth.uid() OR pd.uploaded_by = auth.uid())
            )
        )
    );

-- Update policy - users can update their own documents or admins can update any
CREATE POLICY "Users can update documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'patient-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            )
        )
    );

-- Delete policy - users can delete their own documents or admins can delete any
CREATE POLICY "Users can delete documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'patient-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            ) OR
            EXISTS (
                SELECT 1 FROM patient_documents pd
                WHERE pd.file_path = name
                AND (pd.patient_id = auth.uid() OR pd.uploaded_by = auth.uid())
            )
        )
    );

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
