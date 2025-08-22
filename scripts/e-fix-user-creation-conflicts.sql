-- Enhanced function to force delete auth users with better error handling
CREATE OR REPLACE FUNCTION force_delete_auth_user(user_email text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    auth_user_record auth.users%ROWTYPE;
    result jsonb;
BEGIN
    -- Normalize email
    user_email := lower(trim(user_email));
    
    -- Log the operation
    RAISE LOG 'Attempting to force delete auth user: %', user_email;
    
    -- Check if user exists in auth.users
    SELECT * INTO auth_user_record 
    FROM auth.users 
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Auth user with email ' || user_email || ' was not found (may already be deleted)',
            'user_found', false
        );
    END IF;
    
    -- Delete from auth.identities first (if exists)
    BEGIN
        DELETE FROM auth.identities WHERE user_id = auth_user_record.id;
        RAISE LOG 'Deleted identities for user: %', user_email;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'No identities found or error deleting identities for user: %, error: %', user_email, SQLERRM;
    END;
    
    -- Delete from auth.sessions (if exists)
    BEGIN
        DELETE FROM auth.sessions WHERE user_id = auth_user_record.id;
        RAISE LOG 'Deleted sessions for user: %', user_email;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'No sessions found or error deleting sessions for user: %, error: %', user_email, SQLERRM;
    END;
    
    -- Delete from auth.refresh_tokens (if exists)
    BEGIN
        DELETE FROM auth.refresh_tokens WHERE user_id = auth_user_record.id;
        RAISE LOG 'Deleted refresh tokens for user: %', user_email;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'No refresh tokens found or error deleting refresh tokens for user: %, error: %', user_email, SQLERRM;
    END;
    
    -- Finally delete from auth.users
    BEGIN
        DELETE FROM auth.users WHERE id = auth_user_record.id;
        RAISE LOG 'Successfully deleted auth user: %', user_email;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Successfully deleted auth user: ' || user_email,
            'user_found', true,
            'user_id', auth_user_record.id
        );
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error deleting auth user: %, error: %', user_email, SQLERRM;
        result := jsonb_build_object(
            'success', false,
            'error', 'Failed to delete auth user: ' || SQLERRM,
            'user_found', true,
            'user_id', auth_user_record.id
        );
    END;
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Exception in force_delete_auth_user for %: %', user_email, SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Exception occurred: ' || SQLERRM,
        'user_found', false
    );
END;
$$;

-- Also create a function to get detailed auth user info for debugging
CREATE OR REPLACE FUNCTION get_auth_user_details(user_email text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    auth_user_record auth.users%ROWTYPE;
    identity_count int;
    session_count int;
    refresh_token_count int;
    result jsonb;
BEGIN
    user_email := lower(trim(user_email));
    
    -- Get auth user
    SELECT * INTO auth_user_record 
    FROM auth.users 
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'exists', false,
            'email', user_email,
            'message', 'Auth user not found'
        );
    END IF;
    
    -- Count related records
    SELECT count(*) INTO identity_count FROM auth.identities WHERE user_id = auth_user_record.id;
    SELECT count(*) INTO session_count FROM auth.sessions WHERE user_id = auth_user_record.id;
    SELECT count(*) INTO refresh_token_count FROM auth.refresh_tokens WHERE user_id = auth_user_record.id;
    
    result := jsonb_build_object(
        'exists', true,
        'user_id', auth_user_record.id,
        'email', auth_user_record.email,
        'created_at', auth_user_record.created_at,
        'confirmed_at', auth_user_record.confirmed_at,
        'identity_count', identity_count,
        'session_count', session_count,
        'refresh_token_count', refresh_token_count
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'exists', false,
        'error', SQLERRM,
        'email', user_email
    );
END;
$$;
