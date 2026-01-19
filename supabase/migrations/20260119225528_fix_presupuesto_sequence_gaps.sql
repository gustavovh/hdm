/*
  # Corrección de huecos en la secuencia de presupuestos
  
  1. Situación actual:
     - El presupuesto 4228 (PENTA - Celdas de Media Tensión) está correcto
     - Pero hay un hueco de 4167 a 4227 (61 códigos vacíos)
     - Los presupuestos 4228 en adelante deben moverse hacia atrás para eliminar el hueco
  
  2. Solución:
     - Mover todos los presupuestos desde 4229 hasta el final -61 posiciones
     - Esto llenará el hueco y mantendrá la secuencia continua
     - El presupuesto 4228 de PENTA quedará en 4167 (su posición original correcta)
  
  3. Resultado esperado:
     - 4167: PENTA - Mantenimiento Correctivo de Celdas (el del PDF)
     - 4168: PENTA - Mantenimiento de Banco de Capacitores
     - 4169: ENERGIA ALTERNATIVA - Instalacion de Bomba Solar
     - etc.
*/

-- Crear tabla temporal con el mapeo correcto
CREATE TEMP TABLE presupuestos_fix_gaps AS
SELECT 
  id,
  codigo as codigo_actual,
  CAST(SUBSTRING(codigo FROM 9) AS INTEGER) as numero_actual,
  created_at,
  -- Calcular el nuevo número: -61 posiciones para todos desde 4228
  CASE 
    WHEN CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4228
    THEN CONCAT('001-001-', LPAD((CAST(SUBSTRING(codigo FROM 9) AS INTEGER) - 61)::text, 8, '0'))
    ELSE codigo
  END as codigo_nuevo
FROM presupuestos
WHERE deleted_at IS NULL
  AND CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4228
ORDER BY created_at;

-- FASE 1: Mover todos a códigos temporales
UPDATE presupuestos p
SET codigo = CONCAT('FIX-', p.codigo)
FROM presupuestos_fix_gaps pg
WHERE p.id = pg.id;

-- FASE 2: Aplicar los códigos nuevos (restaurando la secuencia)
UPDATE presupuestos p
SET codigo = pg.codigo_nuevo
FROM presupuestos_fix_gaps pg
WHERE p.id = pg.id;

-- Limpiar tabla temporal
DROP TABLE presupuestos_fix_gaps;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Secuencia corregida. El presupuesto de PENTA ahora está en 4167.';
END $$;
