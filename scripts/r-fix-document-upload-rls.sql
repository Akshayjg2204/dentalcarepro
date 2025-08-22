-- Fix RLS policies for patient_documents to allow proper document uploads

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert documents" ON patient_documents;

-- Create a more permissive INSERT policy that works with client-side authentication
CREATE POLICY "Authenticated users can insert documents" ON patient_documents
    FOR INSERT WITH CHECK (
        -- Allow if user is authenticated and uploading for themselves
        (auth.uid() IS NOT NULL AND auth.uid() = uploaded_by AND auth.uid() = patient_id)
        OR
        -- Allow if user is authenticated and has admin/doctor/staff role
        (auth.uid() IS NOT NULL AND auth.uid() = uploaded_by AND 
         EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
         ))
    );

-- Also update the SELECT policy to be more permissive
DROP POLICY IF EXISTS "Users can view their own documents" ON patient_documents;

CREATE POLICY "Authenticated users can view documents" ON patient_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid() = patient_id OR 
            auth.uid() = uploaded_by OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            )
        )
    );

-- Grant additional permissions to ensure proper access
GRANT ALL ON patient_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
