/*
  # Fix duplicate codigo generation issue

  1. Changes
    - Improve code generation to prevent race conditions
    - Use advisory locks to prevent concurrent code generation
    - Add better error handling
*/

-- Drop and recreate with advisory lock
DROP FUNCTION IF EXISTS generate_presupuesto_codigo();

CREATE OR REPLACE FUNCTION generate_presupuesto_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_code TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_code TEXT;
BEGIN
  -- Use advisory lock to prevent concurrent executions
  PERFORM pg_advisory_lock(123456789);
  
  BEGIN
    -- Get the highest number from existing codes
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) INTO last_number
    FROM presupuestos
    WHERE codigo ~ '^PRE-[0-9]{6}$';
    
    -- Generate new code
    new_number := last_number + 1;
    new_code := 'PRE-' || LPAD(new_number::TEXT, 6, '0');
    
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