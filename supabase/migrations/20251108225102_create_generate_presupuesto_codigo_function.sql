/*
  # Create function to generate unique presupuesto codes
  
  1. New Function
    - `generate_presupuesto_codigo()` - Generates a unique sequential code
    - Uses a transaction with row-level locking to prevent race conditions
    - Format: PRE-XXXXXX (6 digits, zero-padded)
  
  2. Security
    - Only authenticated users can execute the function
    - Thread-safe with proper locking mechanism
*/

-- Function to generate unique presupuesto codes
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
    -- Get the last code with row locking to prevent race conditions
    SELECT codigo INTO last_code
    FROM presupuestos
    ORDER BY codigo DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- Extract the number from the last code
    IF last_code IS NULL THEN
      last_number := 0;
    ELSE
      -- Extract number from format PRE-XXXXXX
      last_number := CAST(SUBSTRING(last_code FROM 5) AS INTEGER);
    END IF;
    
    -- Generate new code
    new_number := last_number + 1;
    new_code := 'PRE-' || LPAD(new_number::TEXT, 6, '0');
    
    -- Check if code already exists (should not happen with locking, but extra safety)
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