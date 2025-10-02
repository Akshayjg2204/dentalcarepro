-- Clean up any orphaned or invalid treatment records
-- This script will help identify and optionally remove treatments that may be causing stat discrepancies

-- First, let's see what we have
SELECT 
  pt.id,
  pt.patient_id,
  pt.treatment_id,
  pt.status,
  pt.created_at,
  u.first_name || ' ' || u.last_name as patient_name,
  t.name as treatment_name
FROM patient_treatments pt
LEFT JOIN users u ON pt.patient_id = u.id
LEFT JOIN treatments t ON pt.treatment_id = t.id
ORDER BY pt.created_at DESC;

-- Check for treatments with invalid patient references
SELECT 
  pt.id,
  pt.patient_id,
  pt.status,
  'Invalid patient reference' as issue
FROM patient_treatments pt
LEFT JOIN users u ON pt.patient_id = u.id
WHERE u.id IS NULL;

-- Check for treatments with invalid treatment references
SELECT 
  pt.id,
  pt.treatment_id,
  pt.status,
  'Invalid treatment reference' as issue
FROM patient_treatments pt
LEFT JOIN treatments t ON pt.treatment_id = t.id
WHERE t.id IS NULL;

-- If you want to clean up orphaned records, uncomment the following:
-- DELETE FROM patient_treatments 
-- WHERE patient_id NOT IN (SELECT id FROM users WHERE role = 'patient');

-- DELETE FROM patient_treatments 
-- WHERE treatment_id NOT IN (SELECT id FROM treatments);
