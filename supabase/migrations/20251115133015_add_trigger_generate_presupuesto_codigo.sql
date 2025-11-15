/*
  # Add trigger to auto-generate presupuesto codigo on insert
  
  1. Changes
    - Create trigger function to auto-generate codigo when inserting presupuestos
    - Add BEFORE INSERT trigger to presupuestos table
    
  2. Notes
    - The codigo will be generated automatically when NULL or empty
    - Uses the existing generate_presupuesto_codigo() function
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION set_presupuesto_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate code if not provided
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_presupuesto_codigo();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_set_presupuesto_codigo ON presupuestos;

-- Create trigger
CREATE TRIGGER trigger_set_presupuesto_codigo
  BEFORE INSERT ON presupuestos
  FOR EACH ROW
  EXECUTE FUNCTION set_presupuesto_codigo();

GRANT EXECUTE ON FUNCTION set_presupuesto_codigo() TO authenticated;
