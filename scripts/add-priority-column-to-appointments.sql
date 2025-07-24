-- Add priority column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- Add check constraint for priority values
ALTER TABLE appointments 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Update existing records to have normal priority
UPDATE appointments 
SET priority = 'normal' 
WHERE priority IS NULL;
