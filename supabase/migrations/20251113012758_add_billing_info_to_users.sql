/*
  # Add billing information fields to users table

  1. New Fields
    - `razon_social` (text) - Business name for invoicing
    - `ruc` (text) - Tax ID number (RUC in Paraguay)
    - `direccion_facturacion` (text) - Billing address
    - `ciudad_facturacion` (text) - Billing city
    - `telefono_facturacion` (text) - Billing phone

  2. Security
    - No changes to RLS policies needed
    - Users can update their own billing info through existing policies
*/

-- Add billing fields to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'razon_social'
  ) THEN
    ALTER TABLE users ADD COLUMN razon_social text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'ruc'
  ) THEN
    ALTER TABLE users ADD COLUMN ruc text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'direccion_facturacion'
  ) THEN
    ALTER TABLE users ADD COLUMN direccion_facturacion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'ciudad_facturacion'
  ) THEN
    ALTER TABLE users ADD COLUMN ciudad_facturacion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'telefono_facturacion'
  ) THEN
    ALTER TABLE users ADD COLUMN telefono_facturacion text;
  END IF;
END $$;