-- Create or replace the delete_billing_record function
CREATE OR REPLACE FUNCTION delete_billing_record(p_billing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete the billing record
    DELETE FROM billing_records 
    WHERE id = p_billing_id;
    
    -- Get the number of deleted rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return true if a record was deleted, false otherwise
    IF deleted_count > 0 THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'Billing record not found or already deleted';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_billing_record(UUID) TO authenticated;
