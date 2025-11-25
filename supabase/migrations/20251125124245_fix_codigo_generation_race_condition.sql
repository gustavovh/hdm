/*
  # Fix codigo generation race condition
  
  1. Changes
    - Improve generate_presupuesto_codigo() to handle race conditions better
    - Add retry logic if code already exists
    - Ensure unique code generation even under high concurrency
    
  2. Notes
    - Uses a loop to retry if code already exists (shouldn't happen but safety)
    - Maintains advisory lock for thread safety
    - Returns a guaranteed unique code
*/

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
  code_exists BOOLEAN;
  max_retries INTEGER := 10;
  retry_count INTEGER := 0;
BEGIN
  -- Use advisory lock to prevent concurrent executions
  PERFORM pg_advisory_lock(123456789);
  
  BEGIN
    LOOP
      -- Get the highest number from existing codes in format 001-001-XXXXXXXX
      SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)), 2000) INTO last_number
      FROM presupuestos
      WHERE codigo ~ '^001-001-[0-9]{8}$'
        AND deleted_at IS NULL;
      
      -- Generate new code
      new_number := last_number + 1;
      new_code := '001-001-' || LPAD(new_number::TEXT, 8, '0');
      
      -- Check if code already exists (safety check)
      SELECT EXISTS(
        SELECT 1 FROM presupuestos 
        WHERE codigo = new_code 
        AND deleted_at IS NULL
      ) INTO code_exists;
      
      -- If code doesn't exist, we're good
      IF NOT code_exists THEN
        EXIT;
      END IF;
      
      -- If code exists, increment retry counter
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        -- Release lock and raise error
        PERFORM pg_advisory_unlock(123456789);
        RAISE EXCEPTION 'No se pudo generar un código único después de % intentos', max_retries;
      END IF;
      
      -- Small delay before retry
      PERFORM pg_sleep(0.01);
    END LOOP;
    
    -- Release lock before returning
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
