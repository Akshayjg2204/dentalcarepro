-- Diagnostic script to check current treatment status values
SELECT 
  status,
  COUNT(*) as count
FROM patient_treatments
GROUP BY status
ORDER BY count DESC;

-- Show all distinct status values
SELECT DISTINCT status FROM patient_treatments;
