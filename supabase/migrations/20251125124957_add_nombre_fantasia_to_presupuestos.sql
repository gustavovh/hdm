/*
  # Add nombre_fantasia field to presupuestos
  
  1. Changes
    - Add nombre_fantasia column to presupuestos table
    - This field will store the trade name/fantasy name of clients
    - Used when the business name differs from the legal name (razon social)
    
  2. Notes
    - Field is optional (can be NULL)
    - Will be displayed in PDFs and forms when present
*/

-- Add nombre_fantasia column
ALTER TABLE presupuestos 
ADD COLUMN IF NOT EXISTS nombre_fantasia TEXT;

-- Add comment for documentation
COMMENT ON COLUMN presupuestos.nombre_fantasia IS 'Nombre de fantasía del cliente (trade name) cuando difiere de la razón social';
