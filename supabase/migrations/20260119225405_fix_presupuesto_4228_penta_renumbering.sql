/*
  # Corrección de numeración: Presupuesto 4228 debe ser de PENTA SA
  
  1. Problema identificado:
     - El presupuesto 001-001-00004228 debe ser de PENTA SA (Mantenimiento Correctivo de Celdas de Media Tensión - Locatario UNICENTRO)
     - Actualmente el código 4228 está asignado incorrectamente a CONSORCIO DE COPROPIETARIOS DEL EDIFICIO ANCORA
     - El presupuesto correcto de PENTA está en el código 4167
  
  2. Solución:
     - Mover el presupuesto de PENTA (ID: 894a039b-0fdf-48b0-8e96-2d4cd3956f5f) del código 4167 al 4228
     - Renumerar todos los presupuestos desde 4168 hasta el último para mantener el orden cronológico
  
  3. Estrategia:
     - Usar tabla temporal para calcular nuevas numeraciones
     - Aplicar los cambios en batch para evitar conflictos de unique constraint
*/

-- Crear tabla temporal con el mapeo correcto
CREATE TEMP TABLE presupuestos_renumber AS
SELECT 
  id,
  codigo as codigo_actual,
  CAST(SUBSTRING(codigo FROM 9) AS INTEGER) as numero_actual,
  created_at,
  -- Calcular el nuevo número: +61 posiciones para todos desde 4167
  CASE 
    WHEN CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4167 
    THEN CONCAT('001-001-', LPAD((CAST(SUBSTRING(codigo FROM 9) AS INTEGER) + 61)::text, 8, '0'))
    ELSE codigo
  END as codigo_nuevo
FROM presupuestos
WHERE deleted_at IS NULL
  AND CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4167
ORDER BY created_at;

-- Mostrar el plan de renumeración para los primeros presupuestos
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Plan de renumeración:';
  FOR rec IN 
    SELECT * FROM presupuestos_renumber 
    WHERE numero_actual BETWEEN 4167 AND 4240
    ORDER BY numero_actual
    LIMIT 20
  LOOP
    RAISE NOTICE '% -> %', rec.codigo_actual, rec.codigo_nuevo;
  END LOOP;
END $$;

-- FASE 1: Mover todos a códigos temporales (usando prefijo 'TMP')
UPDATE presupuestos p
SET codigo = CONCAT('TMP-', p.codigo)
FROM presupuestos_renumber pr
WHERE p.id = pr.id;

-- FASE 2: Aplicar los códigos nuevos
UPDATE presupuestos p
SET codigo = pr.codigo_nuevo
FROM presupuestos_renumber pr
WHERE p.id = pr.id;

-- Limpiar tabla temporal
DROP TABLE presupuestos_renumber;
