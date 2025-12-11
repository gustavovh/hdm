/*
  # Add factura_pdf_url field to presupuestos table

  1. Changes
    - Add `factura_pdf_url` (text) - URL to uploaded invoice PDF file stored in Supabase Storage
    - This replaces the enlace_comprobante field for storing invoice documents

  2. Security
    - No RLS changes needed - inherits from presupuestos table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'factura_pdf_url'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN factura_pdf_url text;
  END IF;
END $$;

COMMENT ON COLUMN presupuestos.factura_pdf_url IS 'URL to uploaded invoice PDF file in Supabase Storage';
