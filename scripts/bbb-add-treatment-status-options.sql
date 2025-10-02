-- Add new treatment status options
-- Step 1: Drop the existing constraint FIRST to allow updates
ALTER TABLE patient_treatments DROP CONSTRAINT IF EXISTS patient_treatments_status_check;

-- Step 2: Update existing treatments to use new status values
UPDATE patient_treatments 
SET status = CASE 
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'in_progress' THEN 'ongoing'
  WHEN status = 'planned' THEN 'ongoing'
  WHEN status = 'cancelled' THEN 'opd_not_converted'
  ELSE 'ongoing'
END;

-- Step 3: Add new constraint with updated status options
ALTER TABLE patient_treatments 
ADD CONSTRAINT patient_treatments_status_check 
CHECK (status IN ('completed', 'ongoing', 'opd_not_converted'));

-- Step 4: Set default status to 'ongoing' for new records
ALTER TABLE patient_treatments ALTER COLUMN status SET DEFAULT 'ongoing';
