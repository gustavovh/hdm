/*
  # Agregar campo Concepto a presupuestos

  1. Cambios
    - Agregar columna `concepto` (text, NOT NULL)
    - Campo describe el propósito/título del presupuesto
    - Será visible en encabezado y listados

  2. Notas
    - Campo requerido según relevamiento 4.1.1
    - Se usa DEFAULT '' para compatibilidad con registros existentes
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'concepto'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN concepto text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Agregar índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_presupuestos_concepto ON presupuestos(concepto);
