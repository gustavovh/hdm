/*
  # Fix presupuesto code generation function
  
  1. Changes
    - Fix ordering to handle inconsistent code formats (PRE- vs PRES-)
    - Order by numeric value instead of alphabetic
    - Only consider codes that match the current format (PRE-XXXXXX)
    - More robust parsing logic
*/

-- Drop and recreate the function with improved logic
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
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Get the last code that matches format PRE-XXXXXX
    -- Order by the numeric part, not alphabetically
    SELECT codigo INTO last_code
    FROM presupuestos
    WHERE codigo ~ '^PRE-[0-9]{6}$'  -- Only codes matching PRE-XXXXXX format
    ORDER BY CAST(SUBSTRING(codigo FROM 5) AS INTEGER) DESC  -- Order by number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- Extract the number from the last code
    IF last_code IS NULL THEN
      last_number := 0;
    ELSE
      -- Extract number from format PRE-XXXXXX
      BEGIN
        last_number := CAST(SUBSTRING(last_code FROM 5) AS INTEGER);
      EXCEPTION
        WHEN OTHERS THEN
          last_number := 0;
      END;
    END IF;
    
    -- Generate new code
    new_number := last_number + 1;
    new_code := 'PRE-' || LPAD(new_number::TEXT, 6, '0');
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM presupuestos WHERE codigo = new_code) THEN
      RETURN new_code;
    END IF;
    
    -- If code exists, increment attempt counter
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
    END IF;
    
    -- Small delay before retry
    PERFORM pg_sleep(0.1);
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_presupuesto_codigo() TO authenticated;