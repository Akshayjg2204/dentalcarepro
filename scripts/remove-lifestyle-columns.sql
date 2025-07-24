-- Remove lifestyle-related columns that are causing constraint violations
-- This script safely removes columns that are no longer needed

-- First, check if the columns exist before trying to drop them
DO $$ 
BEGIN
    -- Drop lifestyle_habits column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'lifestyle_habits'
    ) THEN
        ALTER TABLE users DROP COLUMN lifestyle_habits;
        RAISE NOTICE 'Dropped lifestyle_habits column';
    END IF;

    -- Drop smoking_status column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'smoking_status'
    ) THEN
        ALTER TABLE users DROP COLUMN smoking_status;
        RAISE NOTICE 'Dropped smoking_status column';
    END IF;

    -- Drop alcohol_consumption column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'alcohol_consumption'
    ) THEN
        ALTER TABLE users DROP COLUMN alcohol_consumption;
        RAISE NOTICE 'Dropped alcohol_consumption column';
    END IF;

    -- Drop exercise_frequency column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'exercise_frequency'
    ) THEN
        ALTER TABLE users DROP COLUMN exercise_frequency;
        RAISE NOTICE 'Dropped exercise_frequency column';
    END IF;

    -- Drop any related CHECK constraints
    -- Note: This will attempt to drop constraints that might not exist, which is safe
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_smoking_status_check;
        RAISE NOTICE 'Dropped smoking_status check constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No smoking_status check constraint to drop';
    END;

    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_alcohol_consumption_check;
        RAISE NOTICE 'Dropped alcohol_consumption check constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No alcohol_consumption check constraint to drop';
    END;

    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_exercise_frequency_check;
        RAISE NOTICE 'Dropped exercise_frequency check constraint if it existed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No exercise_frequency check constraint to drop';
    END;

END $$;

-- Verify the table structure after cleanup
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
