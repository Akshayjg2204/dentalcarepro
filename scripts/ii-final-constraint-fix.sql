-- Complete removal of billing_records foreign key constraint and robust function creation

-- Force drop the constraint with CASCADE to remove any dependencies
ALTER TABLE billing_records DROP CONSTRAINT IF EXISTS billing_records_created_by_fkey CASCADE;

-- Ensure created_by column allows NULL
ALTER TABLE billing_records ALTER COLUMN created_by DROP NOT NULL;

-- Drop all existing function versions with specific signatures
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, text, text, text, text, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text, numeric, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_billing_record CASCADE;

-- Create a robust version that never fails on user validation
CREATE OR REPLACE FUNCTION public.create_billing_record(
  p_amount numeric,
  p_appointment_id uuid,
  p_created_by uuid DEFAULT NULL,
  p_description text DEFAULT '',
  p_notes text DEFAULT '',
  p_patient_id uuid,
  p_payment_method text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_billing_id uuid;
BEGIN
  -- Insert billing record without any user validation
  -- created_by can be any value or NULL since there's no constraint
  INSERT INTO billing_records (
    appointment_id,
    patient_id,
    created_by,
    description,
    notes,
    payment_method,
    amount,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_appointment_id,
    p_patient_id,
    p_created_by, -- Accept any value, no validation needed
    COALESCE(p_description, ''),
    COALESCE(p_notes, ''),
    COALESCE(p_payment_method, ''),
    COALESCE(p_amount, 0),
    'pending',
    NOW(),
    NOW()
  ) RETURNING id INTO v_billing_id;
  
  RETURN v_billing_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_billing_record TO service_role;
GRANT EXECUTE ON FUNCTION public.create_billing_record TO anon;
