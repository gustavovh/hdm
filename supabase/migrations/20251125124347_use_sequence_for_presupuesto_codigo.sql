/*
  # Use PostgreSQL sequence for presupuesto codigo generation
  
  1. Changes
    - Create a dedicated sequence for presupuesto numbering
    - Update generate_presupuesto_codigo() to use the sequence
    - Initialize sequence to current max + 1
    
  2. Notes
    - Sequences are atomic and thread-safe by design
    - No need for advisory locks
    - Much more reliable than calculating MAX()
*/

-- Create sequence if it doesn't exist
DO $$
BEGIN
  -- Drop existing sequence if it exists
  DROP SEQUENCE IF EXISTS presupuesto_codigo_seq;
  
  -- Create new sequence starting from current max
  EXECUTE format('CREATE SEQUENCE presupuesto_codigo_seq START WITH %s', 
    (SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)), 2000) + 1
     FROM presupuestos
     WHERE codigo ~ '^001-001-[0-9]{8}$'
       AND deleted_at IS NULL));
END $$;

-- Recreate function to use sequence
DROP FUNCTION IF EXISTS generate_presupuesto_codigo();

CREATE OR REPLACE FUNCTION generate_presupuesto_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number BIGINT;
  new_code TEXT;
BEGIN
  -- Get next value from sequence (atomic operation)
  new_number := nextval('presupuesto_codigo_seq');
  
  -- Format as 001-001-XXXXXXXX
  new_code := '001-001-' || LPAD(new_number::TEXT, 8, '0');
  
  RETURN new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_presupuesto_codigo() TO authenticated;
GRANT USAGE ON SEQUENCE presupuesto_codigo_seq TO authenticated;
