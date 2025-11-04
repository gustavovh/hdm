/*
  # Add invoice fields to presupuestos table

  1. Changes
    - Add `numero_factura` (text) - Invoice number
    - Add `monto_factura` (decimal) - Invoice amount
    - Add `condicion_pago` (text) - Payment terms
    - Add `medio_pago` (text) - Payment method
    - Add `enlace_comprobante` (text) - Link to receipt/proof

  2. Notes
    - These fields are optional and only populated when status changes to FACTURADO
    - Allows complete invoice tracking within the system
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'numero_factura'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN numero_factura text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'monto_factura'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN monto_factura decimal(14,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'condicion_pago'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN condicion_pago text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'medio_pago'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN medio_pago text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'enlace_comprobante'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN enlace_comprobante text;
  END IF;
END $$;
