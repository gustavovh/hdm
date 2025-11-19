/*
  # Renumber all presupuestos starting from 001-001-00002000
  
  1. Changes
    - Renumbers all existing presupuestos in chronological order
    - Starting number: 001-001-00002000
    - Maintains chronological order based on created_at and id
    - Updates all presupuestos with new sequential codes
  
  2. Notes
    - This is a one-time data fix to standardize all budget codes
    - Uses a temporary table to calculate new codes
    - Preserves all other data intact
*/

-- Create a temporary sequence for renumbering
DO $$
DECLARE
  presupuesto_record RECORD;
  counter INTEGER := 2000;
  new_code TEXT;
BEGIN
  -- Loop through all presupuestos in chronological order
  FOR presupuesto_record IN 
    SELECT id 
    FROM presupuestos 
    ORDER BY created_at ASC, id ASC
  LOOP
    -- Generate new code in format 001-001-00002000
    new_code := '001-001-' || LPAD(counter::TEXT, 8, '0');
    
    -- Update the presupuesto with new code
    UPDATE presupuestos 
    SET codigo = new_code 
    WHERE id = presupuesto_record.id;
    
    -- Increment counter
    counter := counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Renumbered % presupuestos starting from 001-001-00002000', counter - 2000;
END $$;

-- Verify the renumbering
DO $$
DECLARE
  first_code TEXT;
  last_code TEXT;
  total_count INTEGER;
BEGIN
  SELECT codigo INTO first_code 
  FROM presupuestos 
  ORDER BY created_at ASC, id ASC 
  LIMIT 1;
  
  SELECT codigo INTO last_code 
  FROM presupuestos 
  ORDER BY created_at DESC, id DESC 
  LIMIT 1;
  
  SELECT COUNT(*) INTO total_count 
  FROM presupuestos;
  
  RAISE NOTICE 'First code: %, Last code: %, Total: %', first_code, last_code, total_count;
END $$;