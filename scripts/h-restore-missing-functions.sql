-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.list_orphaned_auth_users();
DROP FUNCTION IF EXISTS public.force_delete_auth_user(text);
DROP FUNCTION IF EXISTS public.force_delete_auth_user_by_id(uuid);
DROP FUNCTION IF EXISTS public.safe_insert_user_profile(uuid, text, text, text, text, text, date, text, text, text);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_profiles();
DROP FUNCTION IF EXISTS public.cleanup_orphaned_auth_users();
DROP FUNCTION IF EXISTS public.create_auth_user_bypass(text, text, jsonb);

-- Function to list orphaned auth users (users in auth.users but not in public.users)
CREATE OR REPLACE FUNCTION public.list_orphaned_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_users jsonb;
BEGIN
    -- Get auth users that don't have corresponding profiles
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', au.id,
            'email', au.email,
            'created_at', au.created_at,
            'confirmed_at', au.confirmed_at
        )
    )
    INTO orphaned_users
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
    AND au.email IS NOT NULL;

    -- Return empty array if no orphaned users found
    IF orphaned_users IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN orphaned_users;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Function to force delete auth user by email
CREATE OR REPLACE FUNCTION public.force_delete_auth_user(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    result jsonb;
BEGIN
    -- Normalize email
    target_email := lower(trim(target_email));
    
    -- Find the user ID
    SELECT id INTO user_id
    FROM auth.users
    WHERE lower(trim(email)) = target_email;

    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || target_email
        );
    END IF;

    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = user_id;

    -- Check if deletion was successful
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to delete auth user'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auth user deleted successfully: ' || target_email,
        'deleted_user_id', user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Function to force delete auth user by ID
CREATE OR REPLACE FUNCTION public.force_delete_auth_user_by_id(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email text;
BEGIN
    -- Get user email for logging
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = target_user_id;

    IF user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with ID: ' || target_user_id
        );
    END IF;

    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;

    -- Check if deletion was successful
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to delete auth user'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auth user deleted successfully: ' || user_email,
        'deleted_user_id', target_user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Function to safely insert user profile
CREATE OR REPLACE FUNCTION public.safe_insert_user_profile(
    user_id uuid,
    user_email text,
    first_name text,
    last_name text,
    user_role text,
    phone_number text DEFAULT NULL,
    birth_date date DEFAULT NULL,
    user_address text DEFAULT NULL,
    emergency_name text DEFAULT NULL,
    emergency_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_user_id uuid;
    existing_email text;
    inserted_user jsonb;
BEGIN
    -- Normalize email
    user_email := lower(trim(user_email));
    
    -- Check if user with this ID already exists
    SELECT id INTO existing_user_id
    FROM public.users
    WHERE id = user_id;

    IF existing_user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User profile with this ID already exists: ' || user_id
        );
    END IF;

    -- Check if user with this email already exists
    SELECT email INTO existing_email
    FROM public.users
    WHERE lower(trim(email)) = user_email;

    IF existing_email IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User profile with this email already exists: ' || user_email
        );
    END IF;

    -- Insert the new user profile
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        role,
        phone,
        date_of_birth,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        first_name,
        last_name,
        user_role,
        phone_number,
        birth_date,
        user_address,
        emergency_name,
        emergency_phone,
        NOW(),
        NOW()
    )
    RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'phone', phone,
        'date_of_birth', date_of_birth,
        'address', address,
        'emergency_contact_name', emergency_contact_name,
        'emergency_contact_phone', emergency_contact_phone,
        'created_at', created_at,
        'updated_at', updated_at
    ) INTO inserted_user;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User profile created successfully',
        'user', inserted_user
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User profile already exists (unique constraint violation)'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Function to cleanup orphaned profiles (profiles without auth users)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    orphaned_profile RECORD;
BEGIN
    -- Find and delete profiles that don't have corresponding auth users
    FOR orphaned_profile IN
        SELECT pu.id, pu.email
        FROM public.users pu
        LEFT JOIN auth.users au ON pu.id = au.id
        WHERE au.id IS NULL
    LOOP
        DELETE FROM public.users WHERE id = orphaned_profile.id;
        deleted_count := deleted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'cleaned_profiles', deleted_count,
        'message', 'Cleaned up ' || deleted_count || ' orphaned profiles'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Function to cleanup all orphaned auth users
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    orphaned_user RECORD;
BEGIN
    -- Find and delete auth users that don't have corresponding profiles
    FOR orphaned_user IN
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
        AND au.email IS NOT NULL
    LOOP
        DELETE FROM auth.users WHERE id = orphaned_user.id;
        deleted_count := deleted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'cleaned_auth_users', deleted_count,
        'message', 'Cleaned up ' || deleted_count || ' orphaned auth users'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.list_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_insert_user_profile(uuid, text, text, text, text, text, date, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auth_user_bypass(TEXT, TEXT, JSONB) TO authenticated;

-- Grant execute permissions to service_role for admin operations
GRANT EXECUTE ON FUNCTION public.list_orphaned_auth_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.force_delete_auth_user_by_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_insert_user_profile(uuid, text, text, text, text, text, date, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_auth_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_auth_user_bypass(TEXT, TEXT, JSONB) TO service_role;
