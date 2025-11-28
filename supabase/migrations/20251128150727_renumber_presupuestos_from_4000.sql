/*
  # Renumber all presupuestos starting from 4000

  1. Changes
    - Renumber all existing presupuestos starting from 001-001-00004000
    - Maintain chronological order based on created_at
    - Reset the sequence to continue from the new max
    
  2. Security
    - This is a one-time data migration
    - Preserves all other data fields
    - Updates only the codigo field
*/

-- Temporarily disable the trigger to avoid interference
ALTER TABLE presupuestos DISABLE TRIGGER trigger_set_presupuesto_codigo;

-- Renumber all presupuestos starting from 4000
WITH ordered_presupuestos AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) + 3999 AS new_number
  FROM presupuestos
  WHERE deleted_at IS NULL
)
UPDATE presupuestos
SET codigo = '001-001-' || LPAD(ordered_presupuestos.new_number::TEXT, 8, '0')
FROM ordered_presupuestos
WHERE presupuestos.id = ordered_presupuestos.id;

-- Re-enable the trigger
ALTER TABLE presupuestos ENABLE TRIGGER trigger_set_presupuesto_codigo;

-- Reset the sequence to continue from the new max
SELECT setval('presupuesto_codigo_seq', 
  (SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)), 4000) + 1
   FROM presupuestos
   WHERE codigo ~ '^001-001-[0-9]{8}$'
     AND deleted_at IS NULL));
