/*
  # Add invoice fields to presupuestos table

  1. Changes
    - Add `factura_numero` (text) - Invoice number
    - Add `factura_timbrado` (text) - Tax stamp number
    - Add `factura_fecha` (date) - Invoice date
    - Add `factura_observacion` (text) - Invoice observations

  2. Notes
    - These fields are optional and only used when budget status is FACTURADO
    - All fields are nullable to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'factura_numero'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN factura_numero text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'factura_timbrado'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN factura_timbrado text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'factura_fecha'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN factura_fecha date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'factura_observacion'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN factura_observacion text;
  END IF;
END $$;