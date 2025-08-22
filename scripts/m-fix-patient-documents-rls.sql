-- Drop existing table and recreate with proper structure and RLS policies
DROP TABLE IF EXISTS patient_documents CASCADE;

-- Create patient_documents table
CREATE TABLE patient_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type TEXT NOT NULL,
    document_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_uploaded_by ON patient_documents(uploaded_by);
CREATE INDEX idx_patient_documents_created_at ON patient_documents(created_at DESC);

-- Enable RLS
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can view documents they uploaded" ON patient_documents;
DROP POLICY IF EXISTS "Admin can view all documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Admin can insert any documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Admin can update any documents" ON patient_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON patient_documents;
DROP POLICY IF EXISTS "Admin can delete any documents" ON patient_documents;

-- Create comprehensive RLS policies
-- SELECT policies
CREATE POLICY "Users can view their own documents" ON patient_documents
    FOR SELECT USING (
        auth.uid() = patient_id OR 
        auth.uid() = uploaded_by OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

-- INSERT policies
CREATE POLICY "Users can insert documents" ON patient_documents
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by AND (
            auth.uid() = patient_id OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'doctor', 'staff')
            )
        )
    );

-- UPDATE policies
CREATE POLICY "Users can update documents" ON patient_documents
    FOR UPDATE USING (
        auth.uid() = uploaded_by OR
        auth.uid() = patient_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

-- DELETE policies
CREATE POLICY "Users can delete documents" ON patient_documents
    FOR DELETE USING (
        auth.uid() = uploaded_by OR
        auth.uid() = patient_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'doctor', 'staff')
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_documents_updated_at 
    BEFORE UPDATE ON patient_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON patient_documents TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
