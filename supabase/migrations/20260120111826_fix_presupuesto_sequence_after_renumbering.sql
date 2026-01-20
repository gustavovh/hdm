/*
  # Corregir secuencia de presupuestos después de renumeración
  
  1. Problema:
     - La secuencia presupuesto_codigo_seq está en 4258
     - Pero el código más alto en la base de datos es 4313
     - Esto causa errores de duplicación al crear nuevos presupuestos
  
  2. Solución:
     - Actualizar la secuencia para que comience desde 4314
     - Esto permite crear nuevos presupuestos sin conflictos
*/

-- Actualizar la secuencia al siguiente valor disponible
SELECT setval('presupuesto_codigo_seq', 
  (SELECT MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)) FROM presupuestos WHERE deleted_at IS NULL), 
  true
);

-- Verificar el nuevo valor
DO $$
DECLARE
  seq_value INTEGER;
BEGIN
  SELECT last_value INTO seq_value FROM presupuesto_codigo_seq;
  RAISE NOTICE 'Secuencia actualizada. Próximo código: %', seq_value + 1;
END $$;
