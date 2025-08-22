-- Fix RLS policies for custom_bills table to allow proper deletion

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete custom bills" ON custom_bills;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON custom_bills;

-- Create a more permissive delete policy
CREATE POLICY "Allow authenticated users to delete custom bills" ON custom_bills
  FOR DELETE
  TO authenticated
  USING (true);

-- Also ensure the table has proper RLS enabled
ALTER TABLE custom_bills ENABLE ROW LEVEL SECURITY;

-- Check if there are any triggers that might be preventing deletion
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'custom_bills';
