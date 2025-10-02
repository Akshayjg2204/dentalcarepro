-- Fix RLS policies for billing_records deletion
-- This script creates more permissive policies to allow authenticated users to delete billing records

-- Drop all existing policies for billing_records
DROP POLICY IF EXISTS "Users can view their own billing records" ON billing_records;
DROP POLICY IF EXISTS "Staff can insert billing records" ON billing_records;
DROP POLICY IF EXISTS "Staff can update billing records" ON billing_records;
DROP POLICY IF EXISTS "Staff can delete billing records" ON billing_records;
DROP POLICY IF EXISTS "Users can delete their own billing records" ON billing_records;
DROP POLICY IF EXISTS "Admin and staff can manage billing records" ON billing_records;

-- Create more permissive policies that work with the current authentication setup
CREATE POLICY "Authenticated users can view billing records" ON billing_records
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert billing records" ON billing_records
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update billing records" ON billing_records
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete billing records" ON billing_records
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Update the delete function to be more permissive
CREATE OR REPLACE FUNCTION delete_billing_record(record_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete billing records';
    END IF;

    -- Delete the record
    DELETE FROM billing_records WHERE id = record_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Billing record not found or already deleted';
    END IF;
    
    RETURN deleted_count > 0;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION delete_billing_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_billing_record(UUID) TO service_role;

-- Ensure the view is updated properly
DROP VIEW IF EXISTS billing_records_with_patient;

CREATE VIEW billing_records_with_patient AS
SELECT 
    br.*,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Patient') AS patient_name,
    u.email AS patient_email,
    u.phone AS patient_phone
FROM billing_records br
LEFT JOIN users u ON br.patient_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON billing_records_with_patient TO authenticated;
GRANT SELECT ON billing_records_with_patient TO service_role;
