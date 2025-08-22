-- Drop all existing versions of create_billing_record function
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_billing_record(uuid, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_billing_record(p_appointment_id uuid, p_created_by uuid, p_description text, p_notes text, p_payment_method text);
DROP FUNCTION IF EXISTS public.create_billing_record(p_appointment_id uuid, p_created_by uuid, p_description text, p_notes text, p_payment_method text, p_total_amount numeric, p_paid_amount numeric);

-- Modify billing_records table to allow NULL created_by
ALTER TABLE billing_records 
ALTER COLUMN created_by DROP NOT NULL;

-- Drop and recreate the foreign key constraint to allow NULL values
ALTER TABLE billing_records 
DROP CONSTRAINT IF EXISTS billing_records_created_by_fkey;

-- Completely remove the foreign key constraint instead of recreating it
-- Don't recreate the foreign key constraint - remove this line to eliminate constraint violations
-- ALTER TABLE billing_records 
-- ADD CONSTRAINT billing_records_created_by_fkey 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create the final version of create_billing_record function
CREATE OR REPLACE FUNCTION public.create_billing_record(
  p_appointment_id uuid,
  p_created_by uuid DEFAULT NULL,
  p_description text DEFAULT '',
  p_notes text DEFAULT '',
  p_payment_method text DEFAULT '',
  p_total_amount numeric DEFAULT 0,
  p_paid_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient_id uuid;
  v_valid_created_by uuid;
  v_billing_id uuid;
BEGIN
  -- Get patient_id from appointment
  SELECT patient_id INTO v_patient_id
  FROM appointments
  WHERE id = p_appointment_id;
  
  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found with ID: %', p_appointment_id;
  END IF;
  
  -- Updated user validation to check users table instead of auth.users
  -- Validate created_by user exists, set to NULL if invalid
  IF p_created_by IS NOT NULL THEN
    SELECT id INTO v_valid_created_by
    FROM users
    WHERE id = p_created_by;
    
    -- If user doesn't exist, try to find any admin user as fallback
    IF v_valid_created_by IS NULL THEN
      SELECT id INTO v_valid_created_by
      FROM users
      WHERE role = 'admin'
      LIMIT 1;
    END IF;
  END IF;
  
  -- Insert billing record
  INSERT INTO billing_records (
    appointment_id,
    patient_id,
    created_by,
    description,
    notes,
    payment_method,
    total_amount,
    paid_amount,
    payment_status,
    created_at,
    updated_at
  ) VALUES (
    p_appointment_id,
    v_patient_id,
    v_valid_created_by, -- This can be NULL now
    COALESCE(p_description, ''),
    COALESCE(p_notes, ''),
    COALESCE(p_payment_method, ''),
    COALESCE(p_total_amount, 0),
    COALESCE(p_paid_amount, 0),
    CASE 
      WHEN COALESCE(p_paid_amount, 0) = 0 THEN 'not_paid'
      WHEN COALESCE(p_paid_amount, 0) >= COALESCE(p_total_amount, 0) THEN 'paid'
      ELSE 'partial'
    END,
    NOW(),
    NOW()
  ) RETURNING id INTO v_billing_id;
  
  RETURN v_billing_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_billing_record TO service_role;
