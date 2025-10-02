-- Fix foreign key constraint to allow user deletion
-- When a user is deleted, set assigned_staff to NULL in leads table

-- Drop the existing constraint
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_assigned_staff_fkey;

-- Recreate the constraint with ON DELETE SET NULL
ALTER TABLE leads
ADD CONSTRAINT leads_assigned_staff_fkey 
FOREIGN KEY (assigned_staff) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Removed created_by constraint as that column doesn't exist in leads table
