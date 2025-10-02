-- Remove excess treatments and keep only 5 initial treatments
DELETE FROM treatments WHERE name NOT IN (
    'Dental Cleaning',
    'Tooth Filling', 
    'Root Canal',
    'Tooth Extraction',
    'Teeth Whitening'
);

-- Update the treatments setup script to only include 5 treatments
-- This ensures future database setups will only have 5 initial treatments
