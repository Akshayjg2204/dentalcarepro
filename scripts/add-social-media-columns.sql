-- Add social media columns to clinic_settings table if they don't exist
DO $$ 
BEGIN
    -- Add facebook column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinic_settings' AND column_name = 'facebook') THEN
        ALTER TABLE clinic_settings ADD COLUMN facebook TEXT;
    END IF;
    
    -- Add instagram column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinic_settings' AND column_name = 'instagram') THEN
        ALTER TABLE clinic_settings ADD COLUMN instagram TEXT;
    END IF;
    
    -- Add twitter column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinic_settings' AND column_name = 'twitter') THEN
        ALTER TABLE clinic_settings ADD COLUMN twitter TEXT;
    END IF;
    
    -- Add website column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinic_settings' AND column_name = 'website') THEN
        ALTER TABLE clinic_settings ADD COLUMN website TEXT;
    END IF;
END $$;
