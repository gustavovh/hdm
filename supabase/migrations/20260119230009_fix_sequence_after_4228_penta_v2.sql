/*
  # Corrección final: Mover presupuestos posteriores a 4228 (v2)
  
  1. Problema:
     - 4228 es correctamente PENTA SA (27/12/2025 14:59)
     - Pero hay presupuestos creados DESPUÉS con códigos MENORES (4168-4227)
     - Y hay presupuestos en 4229+ que ocupan esos códigos
  
  2. Solución:
     - Mover TODOS los presupuestos posteriores a PENTA a temporales primero
     - Luego asignarles códigos secuenciales desde 4229 en orden cronológico
*/

-- Paso 1: Mover TODOS los presupuestos posteriores a PENTA a códigos temporales
UPDATE presupuestos
SET codigo = CONCAT('POSTPENTA-', id::text)
WHERE deleted_at IS NULL
  AND created_at > '2025-12-27 14:59:22';

-- Paso 2: Crear tabla con nueva numeración en orden cronológico
CREATE TEMP TABLE renumerar_post_penta AS
SELECT 
  id,
  created_at,
  -- Asignar códigos secuenciales desde 4229 en orden cronológico
  CONCAT('001-001-', LPAD((4228 + ROW_NUMBER() OVER (ORDER BY created_at))::text, 8, '0')) as codigo_nuevo
FROM presupuestos
WHERE deleted_at IS NULL
  AND codigo LIKE 'POSTPENTA-%'
ORDER BY created_at;

-- Paso 3: Aplicar los nuevos códigos
UPDATE presupuestos p
SET codigo = r.codigo_nuevo
FROM renumerar_post_penta r
WHERE p.id = r.id;

-- Limpiar
DROP TABLE renumerar_post_penta;
