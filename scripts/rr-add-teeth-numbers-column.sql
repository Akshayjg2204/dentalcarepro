-- Add missing teeth_numbers column to patient_treatments table
-- This column is required by the frontend treatment management system

ALTER TABLE patient_treatments 
ADD COLUMN IF NOT EXISTS teeth_numbers VARCHAR(255);

-- Add comment to document the column purpose
COMMENT ON COLUMN patient_treatments.teeth_numbers IS 'Comma-separated list of tooth numbers affected by the treatment (e.g., "1,2,3" or "1-4")';

-- Create index for better performance when searching by teeth numbers
CREATE INDEX IF NOT EXISTS idx_patient_treatments_teeth_numbers 
ON patient_treatments(teeth_numbers);

-- Update existing records to have NULL teeth_numbers (will be filled in by users)
-- No need to update existing records as the column allows NULL values
