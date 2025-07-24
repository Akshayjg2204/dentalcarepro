-- Add Google Maps link column to clinic_settings table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinic_settings' 
        AND column_name = 'google_maps_link'
    ) THEN
        ALTER TABLE clinic_settings 
        ADD COLUMN google_maps_link TEXT;
    END IF;
END $$;

-- Update existing clinic_settings record with Google Maps link
UPDATE clinic_settings 
SET google_maps_link = 'https://maps.google.com/?q=Shree+Multispeciality+Dental+Clinic+Kopar+Khairane'
WHERE google_maps_link IS NULL OR google_maps_link = '';
