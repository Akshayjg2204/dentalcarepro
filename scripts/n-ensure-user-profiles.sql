-- Ensure user profiles exist and are properly configured

-- Create a function to safely create user profiles
CREATE OR REPLACE FUNCTION create_user_profile_safe(
  user_id UUID,
  user_email TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'patient'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 3;
  final_email TEXT;
  success BOOLEAN := FALSE;
BEGIN
  -- Validate inputs
  IF user_id IS NULL OR user_email IS NULL THEN
    RAISE EXCEPTION 'user_id and user_email cannot be null';
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Try to create user with different email variations if needed
  WHILE attempt_count < max_attempts AND NOT success LOOP
    attempt_count := attempt_count + 1;
    
    -- Determine email to use for this attempt
    IF attempt_count = 1 THEN
      final_email := user_email;
    ELSIF attempt_count = 2 THEN
      final_email := split_part(user_email, '@', 1) || '_' || substring(user_id::text, 1, 8) || '@' || split_part(user_email, '@', 2);
    ELSE
      final_email := split_part(user_email, '@', 1) || '_' || substring(user_id::text, 1, 8) || '_' || extract(epoch from now())::bigint || '@' || split_part(user_email, '@', 2);
    END IF;
    
    BEGIN
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        user_id,
        final_email,
        COALESCE(first_name, split_part(user_email, '@', 1)),
        COALESCE(last_name, ''),
        COALESCE(user_role, 'patient'),
        NOW(),
        NOW()
      );
      
      success := TRUE;
      -- Removed RAISE NOTICE as it's not needed in exception handler
      
    EXCEPTION 
      WHEN unique_violation THEN
        -- Fixed constraint checking using GET STACKED DIAGNOSTICS
        DECLARE
          constraint_name TEXT;
        BEGIN
          GET STACKED DIAGNOSTICS constraint_name = CONSTRAINT_NAME;
          -- If it's not an email conflict, re-raise the exception
          IF SQLSTATE != '23505' OR constraint_name != 'users_email_key' THEN
            RAISE;
          END IF;
          -- Otherwise, continue to next attempt
        END;
    END;
  END LOOP;
  
  IF NOT success THEN
    RAISE EXCEPTION 'Failed to create user profile after % attempts', max_attempts;
  END IF;
  
  RETURN success;
END;
$$;

-- Create a function to ensure user profile exists (called from triggers or app)
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user profile exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
        -- Insert user profile with default values
        INSERT INTO users (
            id,
            email,
            first_name,
            last_name,
            role,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            COALESCE(NEW.email, 'user_' || NEW.id::text || '@temp.com'),
            COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION ensure_user_profile();

-- Update existing auth users who might not have profiles
-- Added better conflict handling for existing users
INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.email, 'user_' || au.id::text || '@temp.com'),
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(au.raw_user_meta_data->>'role', 'patient'),
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Separate statement to handle email conflicts
INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email || '_' || au.id::text,
    COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(au.raw_user_meta_data->>'role', 'patient'),
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
  AND EXISTS (SELECT 1 FROM users u WHERE u.email = au.email)
ON CONFLICT DO NOTHING;

-- Handle email conflicts by making emails unique with user ID suffix
UPDATE users 
SET email = email || '_' || id::text
WHERE id IN (
    SELECT id FROM (
        SELECT id, email, 
               ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
        FROM users
    ) t
    WHERE t.rn > 1
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Ensure admin user exists (if needed)
-- Simplified admin user creation with better conflict handling
DO $$
BEGIN
  -- Only create admin if none exists and handle all conflicts
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' OR email = 'admin@dentalcare.com') THEN
    BEGIN
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        role,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'admin@dentalcare.com',
        'Admin',
        'User',
        'admin',
        NOW(),
        NOW()
      );
    EXCEPTION 
      WHEN unique_violation THEN
        -- Silently ignore if admin already exists
        NULL;
    END;
  END IF;
END $$;

-- Adding the safe_insert_user_profile function that the auth library expects
CREATE OR REPLACE FUNCTION safe_insert_user_profile(
  user_id UUID,
  user_email TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  user_role_text TEXT DEFAULT 'patient',
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
  result JSONB;
  created_user RECORD;
BEGIN
  -- Validate inputs
  IF user_id IS NULL OR user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_id and user_email cannot be null'
    );
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    SELECT * INTO created_user FROM users WHERE id = user_id;
    RETURN jsonb_build_object(
      'success', true,
      'user', row_to_json(created_user),
      'message', 'User already exists'
    );
  END IF;
  
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
      LOWER(TRIM(user_email)),
      COALESCE(first_name, split_part(user_email, '@', 1)),
      COALESCE(last_name, ''),
      COALESCE(user_role_text, 'patient'),
      phone_number,
      birth_date,
      user_address,
      emergency_name,
      emergency_phone,
      NOW(),
      NOW()
    ) RETURNING * INTO created_user;
    
    result := jsonb_build_object(
      'success', true,
      'user', row_to_json(created_user),
      'message', 'User profile created successfully'
    );
    
    RETURN result;
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle email conflicts
      DECLARE
        constraint_name TEXT;
        modified_email TEXT;
      BEGIN
        GET STACKED DIAGNOSTICS constraint_name = CONSTRAINT_NAME;
        
        IF constraint_name = 'users_email_key' THEN
          -- Try with modified email
          modified_email := split_part(user_email, '@', 1) || '_' || substring(user_id::text, 1, 8) || '@' || split_part(user_email, '@', 2);
          
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
            modified_email,
            COALESCE(first_name, split_part(user_email, '@', 1)),
            COALESCE(last_name, ''),
            COALESCE(user_role_text, 'patient'),
            phone_number,
            birth_date,
            user_address,
            emergency_name,
            emergency_phone,
            NOW(),
            NOW()
          ) RETURNING * INTO created_user;
          
          result := jsonb_build_object(
            'success', true,
            'user', row_to_json(created_user),
            'message', 'User profile created with modified email due to conflict'
          );
          
          RETURN result;
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Unique constraint violation: ' || constraint_name
          );
        END IF;
      END;
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Grant execute permissions for the new function
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_insert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO service_role;

-- Wrapped RAISE NOTICE in DO block to fix syntax error
DO $$
BEGIN
  RAISE NOTICE 'User profile management functions created successfully';
END $$;
