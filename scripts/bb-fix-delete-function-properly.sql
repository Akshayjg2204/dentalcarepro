-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_billing_record(uuid);

-- Create proper delete function for billing records
CREATE OR REPLACE FUNCTION delete_billing_record(billing_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Delete the billing record
    DELETE FROM billing_records 
    WHERE id = billing_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Billing record not found or already deleted');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Billing record deleted successfully');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_billing_record(uuid) TO authenticated;
