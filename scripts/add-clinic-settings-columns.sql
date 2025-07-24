-- Add missing columns to clinic_settings table
DO $$ 
BEGIN
    -- Add postal_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'postal_code') THEN
        ALTER TABLE clinic_settings ADD COLUMN postal_code VARCHAR(20);
    END IF;
    
    -- Add zip_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'zip_code') THEN
        ALTER TABLE clinic_settings ADD COLUMN zip_code VARCHAR(20);
    END IF;
    
    -- Add working_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'working_hours') THEN
        ALTER TABLE clinic_settings ADD COLUMN working_hours JSONB;
    END IF;
    
    -- Add facebook column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'facebook') THEN
        ALTER TABLE clinic_settings ADD COLUMN facebook VARCHAR(255);
    END IF;
    
    -- Add instagram column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'instagram') THEN
        ALTER TABLE clinic_settings ADD COLUMN instagram VARCHAR(255);
    END IF;
    
    -- Add twitter column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'twitter') THEN
        ALTER TABLE clinic_settings ADD COLUMN twitter VARCHAR(255);
    END IF;
    
    -- Add website column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_settings' AND column_name = 'website') THEN
        ALTER TABLE clinic_settings ADD COLUMN website VARCHAR(255);
    END IF;
END $$;
