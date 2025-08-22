-- Fix create_billing_record function with proper parameter ordering
-- Required parameters first, then optional parameters with defaults

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_billing_record;

-- Create the function with proper parameter ordering
CREATE OR REPLACE FUNCTION public.create_billing_record(
  p_patient_id uuid,
  p_amount numeric,
  p_appointment_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_description text DEFAULT '',
  p_notes text DEFAULT '',
  p_payment_method text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_record_id uuid;
BEGIN
  -- Insert the billing record
  INSERT INTO public.billing_records (
    patient_id,
    appointment_id,
    description,
    amount,
    payment_method,
    notes,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    p_patient_id,
    p_appointment_id,
    COALESCE(p_description, ''),
    p_amount,
    COALESCE(p_payment_method, ''),
    COALESCE(p_notes, ''),
    p_created_by,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_record_id;

  RETURN new_record_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create billing record: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_billing_record TO anon;
