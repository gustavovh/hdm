/*
  # Fix presupuesto codigo generation to use correct format
  
  1. Changes
    - Update generate_presupuesto_codigo() function to use format 001-001-XXXXXX
    - Ensure correlative numbering across all users and roles
    - Use advisory lock to prevent race conditions
    
  2. Notes
    - The function now correctly parses the existing format
    - Numbers are 8 digits padded with zeros
    - Format: 001-001-00000001, 001-001-00000002, etc.
*/

-- Drop and recreate with correct format
DROP FUNCTION IF EXISTS generate_presupuesto_codigo();

CREATE OR REPLACE FUNCTION generate_presupuesto_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_number INTEGER;
  new_number INTEGER;
  new_code TEXT;
BEGIN
  -- Use advisory lock to prevent concurrent executions
  PERFORM pg_advisory_lock(123456789);
  
  BEGIN
    -- Get the highest number from existing codes in format 001-001-XXXXXXXX
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)), 2000) INTO last_number
    FROM presupuestos
    WHERE codigo ~ '^001-001-[0-9]{8}$'
      AND deleted_at IS NULL;
    
    -- Generate new code
    new_number := last_number + 1;
    new_code := '001-001-' || LPAD(new_number::TEXT, 8, '0');
    
    -- Release lock
    PERFORM pg_advisory_unlock(123456789);
    
    RETURN new_code;
  EXCEPTION
    WHEN OTHERS THEN
      -- Always release lock on error
      PERFORM pg_advisory_unlock(123456789);
      RAISE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_presupuesto_codigo() TO authenticated;
