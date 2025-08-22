-- Ensure user_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('doctor', 'staff', 'patient');
    END IF;
END $$;

-- Create or replace the create_auth_user_bypass function
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
    salt TEXT;
    result JSONB;
BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Generate salt and encrypt password
    salt := gen_random_uuid()::text;
    encrypted_password := crypt(user_password, gen_salt('bf'));
    
    -- Insert into auth.users
    BEGIN
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
            '00000000-0000-0000-0000-000000000000',
            user_email,
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
        
        -- Also insert into auth.identities
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
            jsonb_build_object('sub', new_user_id::text, 'email', user_email),
            'email',
            NOW(),
            NOW(),
            NOW()
        );
        
        result := jsonb_build_object(
            'success', true,
            'user_id', new_user_id,
            'message', 'Auth user created successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create auth user: ' || SQLERRM
        );
    END;
    
    RETURN result;
END;
$$;

-- Create or replace the safe_insert_user_profile function
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
    result JSONB;
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
    
    -- Insert the user profile
    BEGIN
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
            user_email,
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
        
        result := jsonb_build_object(
            'success', true,
            'user', row_to_json(new_user),
            'message', 'User profile created successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create user profile: ' || SQLERRM
        );
    END;
    
    RETURN result;
END;
$$;

-- Create or replace the force_delete_auth_user function
CREATE OR REPLACE FUNCTION force_delete_auth_user(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
    result JSONB;
BEGIN
    -- Find the auth user by email
    SELECT id INTO auth_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF auth_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Auth user not found',
            'message', 'No auth user found with email: ' || target_email
        );
    END IF;
    
    BEGIN
        -- Delete from auth.identities first
        DELETE FROM auth.identities WHERE user_id = auth_user_id;
        
        -- Delete from auth.users
        DELETE FROM auth.users WHERE id = auth_user_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Auth user deleted successfully: ' || target_email
        );
        
    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to delete auth user: ' || SQLERRM
        );
    END;
    
    RETURN result;
END;
$$;

-- Create or replace the list_orphaned_auth_users function
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
    WHERE u.id IS NULL;
    
    RETURN orphaned_users;
END;
$$;

-- Create or replace the cleanup_orphaned_profiles function
CREATE OR REPLACE FUNCTION cleanup_orphaned_profiles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_count INTEGER := 0;
    result JSONB;
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
    
    result := jsonb_build_object(
        'success', true,
        'cleaned_profiles', cleaned_count,
        'message', 'Cleaned up ' || cleaned_count || ' orphaned profiles'
    );
    
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION force_delete_auth_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profiles() TO authenticated;

-- Grant necessary permissions to anon role as well (for public access)
GRANT EXECUTE ON FUNCTION create_auth_user_bypass(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION force_delete_auth_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION list_orphaned_auth_users() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profiles() TO anon;
