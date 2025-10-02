-- Final fix for treatment status values
-- This ensures ALL treatments have valid status values

-- Step 1: Drop the existing constraint
ALTER TABLE patient_treatments DROP CONSTRAINT IF EXISTS patient_treatments_status_check;

-- Step 2: Update ALL existing treatments to use only the three valid status values
UPDATE patient_treatments 
SET status = CASE 
  WHEN status IN ('completed') THEN 'completed'
  WHEN status IN ('in_progress', 'planned', 'ongoing') THEN 'ongoing'
  WHEN status IN ('cancelled', 'opd_not_converted') THEN 'opd_not_converted'
  ELSE 'ongoing'  -- Default any unknown status to ongoing
END;

-- Step 3: Add the constraint with ONLY the three valid status values
ALTER TABLE patient_treatments 
ADD CONSTRAINT patient_treatments_status_check 
CHECK (status IN ('completed', 'ongoing', 'opd_not_converted'));

-- Step 4: Set default status to 'ongoing' for new records
ALTER TABLE patient_treatments ALTER COLUMN status SET DEFAULT 'ongoing';

-- Step 5: Verify the fix
SELECT 
  status,
  COUNT(*) as count
FROM patient_treatments
GROUP BY status
ORDER BY status;
