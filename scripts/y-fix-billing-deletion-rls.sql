-- Fix RLS policies for billing_records table to allow proper deletion

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their own billing records" ON billing_records;
DROP POLICY IF EXISTS "Staff can delete billing records" ON billing_records;

-- Create proper delete policies
CREATE POLICY "Users can delete their own billing records" ON billing_records
    FOR DELETE USING (
        auth.uid() = created_by OR 
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'staff', 'doctor')
        )
    );

-- Also ensure the billing_records_with_patient view is properly updated
-- Drop and recreate the view to ensure it reflects deletions properly
DROP VIEW IF EXISTS billing_records_with_patient;

CREATE VIEW billing_records_with_patient AS
SELECT 
    br.*,
    u.first_name || ' ' || u.last_name AS patient_name,
    u.email AS patient_email,
    u.phone AS patient_phone
FROM billing_records br
JOIN users u ON br.patient_id = u.id
WHERE br.status != 'deleted'; -- Exclude any soft-deleted records

-- Grant proper permissions on the view
GRANT SELECT ON billing_records_with_patient TO authenticated;

-- Ensure proper RLS is enabled
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Add a function to properly delete billing records
CREATE OR REPLACE FUNCTION delete_billing_record(record_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user has permission to delete
    IF NOT (
        auth.uid() IN (
            SELECT created_by FROM billing_records WHERE id = record_id
        ) OR
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'staff', 'doctor')
        )
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to delete billing record';
    END IF;

    -- Delete the record
    DELETE FROM billing_records WHERE id = record_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION delete_billing_record(UUID) TO authenticated;
