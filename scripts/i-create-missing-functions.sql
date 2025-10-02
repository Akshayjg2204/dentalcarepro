-- Create missing functions for user management
-- This script ensures all required functions exist with proper permissions

-- First, ensure the user_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('doctor', 'staff', 'patient');
    END IF;
END $$;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_auth_user_bypass(text, text, jsonb);
DROP FUNCTION IF EXISTS safe_insert_user_profile(uuid, text, text, text, text, text, date, text, text, text);
DROP FUNCTION IF EXISTS force_delete_auth_user(text);
DROP FUNCTION IF EXISTS list_orphaned_auth_users();
DROP FUNCTION IF EXISTS cleanup_orphaned_profiles();

-- Create the auth user bypass function
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
    new_user_id UUID;
    encrypted_password TEXT;
    instance_id UUID;
BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Get instance ID or use default
    SELECT id INTO instance_id FROM auth.instances LIMIT 1;
    IF instance_id IS NULL THEN
        instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    -- Encrypt the password
    encrypted_password := crypt(user_password, gen_salt('bf'));
    
    -- Insert into auth.users
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
        new_user_id,
        instance_id,
        lower(trim(user_email)),
        encrypted_password,
        NOW(),
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
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(user_email))),
        'email',
        NOW(),
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', new_user_id,
        'message', 'Auth user created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to create auth user: ' || SQLERRM
    );
END;
$$;

-- Create the safe insert user profile function
CREATE OR REPLACE FUNCTION safe_insert_user_profile(
    user_id UUID,
    user_email TEXT,
    first_name TEXT,
    last_name TEXT,
    user_role_text TEXT,
    phone_number TEXT DEFAULT NULL,
    birth_date DATE DEFAULT NULL,
    user_address TEXT DEFAULT NULL,
    emergency_name TEXT DEFAULT NULL,
    emergency_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    role_enum user_role;
    new_user RECORD;
BEGIN
    -- Convert text role to enum
    BEGIN
        role_enum := user_role_text::user_role;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid role: ' || user_role_text || '. Must be doctor, staff, or patient.'
        );
    END;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE id = user_id OR email = lower(trim(user_email))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User already exists',
            'message', 'A user with this ID or email already exists'
        );
    END IF;
    
    -- Insert the user profile
    INSERT INTO users (
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
        lower(trim(user_email)),
        first_name,
        last_name,
        role_enum,
        phone_number,
        birth_date,
        user_address,
        emergency_name,
        emergency_phone,
        NOW(),
        NOW()
    ) RETURNING * INTO new_user;
    
    RETURN jsonb_build_object(
        'success', true,
        'user', row_to_json(new_user),
        'message', 'User profile created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to create user profile: ' || SQLERRM
    );
END;
$$;

-- Create the force delete auth user function
CREATE OR REPLACE FUNCTION force_delete_auth_user(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
BEGIN
    -- Find the auth user by email
    SELECT id INTO auth_user_id
    FROM auth.users
    WHERE lower(trim(email)) = lower(trim(target_email));
    
    IF auth_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Auth user not found',
            'message', 'No auth user found with email: ' || target_email
        );
    END IF;
    
    -- Delete from auth.identities first
    DELETE FROM auth.identities WHERE user_id = auth_user_id;
    
    -- Delete from auth.sessions if exists
    DELETE FROM auth.sessions WHERE user_id = auth_user_id;
    
    -- Delete from auth.refresh_tokens if exists
    DELETE FROM auth.refresh_tokens WHERE user_id = auth_user_id;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = auth_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auth user deleted successfully: ' || target_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to delete auth user: ' || SQLERRM
    );
END;
$$;

-- Create the list orphaned auth users function
CREATE OR REPLACE FUNCTION list_orphaned_auth_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_users JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', au.id,
            'email', au.email,
            'created_at', au.created_at
        )
    ), '[]'::jsonb)
    INTO orphaned_users
    FROM auth.users au
    LEFT JOIN users u ON au.id = u.id
    WHERE u.id IS NULL
    AND au.email IS NOT NULL;
    
    RETURN orphaned_users;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'message', 'Failed to list orphaned auth users: ' || SQLERRM
    );
END;
$$;

-- Create the cleanup orphaned profiles function
CREATE OR REPLACE FUNCTION cleanup_orphaned_profiles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Delete user profiles that don't have corresponding auth users
    WITH deleted AS (
        DELETE FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.users au WHERE au.id = u.id
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO cleaned_count FROM deleted;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_profiles', cleaned_count,
        'message', 'Cleaned up ' || cleaned_count || ' orphaned profiles'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to cleanup orphaned profiles: ' || SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION force_delete_auth_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profiles() TO authenticated;

-- Grant execute permissions to anon role as well
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION force_delete_auth_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION list_orphaned_auth_users() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profiles() TO anon;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION force_delete_auth_user(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION list_orphaned_auth_users() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profiles() TO service_role;

-- Ensure service_role has access to auth schema
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
