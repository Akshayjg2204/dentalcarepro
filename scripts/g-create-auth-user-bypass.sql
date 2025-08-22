-- Function to create auth user bypassing email validation
CREATE OR REPLACE FUNCTION create_auth_user_bypass(
  user_email TEXT,
  user_password TEXT,
  user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  encrypted_password TEXT;
  result JSONB;
BEGIN
  -- Generate a new UUID for the user
  user_id := gen_random_uuid();
  
  -- Encrypt the password using Supabase's method
  encrypted_password := crypt(user_password, gen_salt('bf'));
  
  BEGIN
    -- Insert directly into auth.users table
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_new,
      recovery_token
    ) VALUES (
      user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      LOWER(TRIM(user_email)),
      encrypted_password,
      NOW(), -- Auto-confirm email
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      user_metadata,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      ''
    );
    
    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      user_id,
      jsonb_build_object('sub', user_id::text, 'email', LOWER(TRIM(user_email))),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    result := jsonb_build_object(
      'success', true,
      'user_id', user_id,
      'email', LOWER(TRIM(user_email)),
      'message', 'Auth user created successfully via bypass method'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create auth user via bypass method'
    );
    
    RETURN result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO service_role;
