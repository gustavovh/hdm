/*
  # Cerrar el hueco en 4229 (v2)
  
  1. Situación:
     - 4228: PENTA SA (correcto)
     - 4229: vacío
     - 4230+: otros presupuestos
  
  2. Solución:
     - Mover todos los presupuestos desde 4230 en adelante una posición hacia atrás (-1)
*/

-- Crear tabla temporal con el mapeo
CREATE TEMP TABLE close_gap_mapping AS
SELECT 
  id,
  codigo as codigo_actual,
  CAST(SUBSTRING(codigo FROM 9) AS INTEGER) as num_actual,
  CONCAT('001-001-', LPAD((CAST(SUBSTRING(codigo FROM 9) AS INTEGER) - 1)::text, 8, '0')) as codigo_nuevo
FROM presupuestos
WHERE deleted_at IS NULL
  AND CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4230;

-- Mover a temporales
UPDATE presupuestos p
SET codigo = CONCAT('CLOSEGAP-', p.id::text)
FROM close_gap_mapping cgm
WHERE p.id = cgm.id;

-- Aplicar nuevos códigos
UPDATE presupuestos p
SET codigo = cgm.codigo_nuevo
FROM close_gap_mapping cgm
WHERE p.id = cgm.id;

-- Limpiar
DROP TABLE close_gap_mapping;
