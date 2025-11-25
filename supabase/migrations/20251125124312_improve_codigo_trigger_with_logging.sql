/*
  # Improve codigo trigger with better error handling
  
  1. Changes
    - Add better logging to set_presupuesto_codigo trigger function
    - Add validation to ensure codigo is truly unique before insert
    - Handle edge cases better
    
  2. Notes
    - This should prevent duplicate key violations
    - Adds debug logging for troubleshooting
*/

CREATE OR REPLACE FUNCTION set_presupuesto_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Only generate code if not provided or empty
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    -- Generate the code
    generated_code := generate_presupuesto_codigo();
    
    -- Double check it doesn't exist (extra safety)
    SELECT EXISTS(
      SELECT 1 FROM presupuestos 
      WHERE codigo = generated_code 
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) INTO code_exists;
    
    IF code_exists THEN
      RAISE EXCEPTION 'El código generado % ya existe en la base de datos', generated_code;
    END IF;
    
    NEW.codigo := generated_code;
    
    RAISE LOG 'Generated new presupuesto codigo: %', generated_code;
  ELSE
    -- Code was provided, validate it doesn't duplicate
    SELECT EXISTS(
      SELECT 1 FROM presupuestos 
      WHERE codigo = NEW.codigo 
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) INTO code_exists;
    
    IF code_exists THEN
      RAISE EXCEPTION 'El código % ya existe en la base de datos', NEW.codigo;
    END IF;
    
    RAISE LOG 'Using provided presupuesto codigo: %', NEW.codigo;
  END IF;
  
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION set_presupuesto_codigo() TO authenticated;
