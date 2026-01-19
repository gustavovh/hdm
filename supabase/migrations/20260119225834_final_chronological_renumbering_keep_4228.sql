/*
  # Renumeración cronológica final manteniendo 4228 para PENTA
  
  1. Objetivo:
     - El presupuesto de PENTA (27/12/2025 14:59) DEBE mantenerse en código 4228
     - Todos los demás presupuestos siguen orden cronológico secuencial sin saltos
  
  2. Estrategia:
     - Contar presupuestos en orden cronológico
     - Asignar códigos secuenciales desde 4163 en adelante
     - Cuando llegamos al presupuesto de PENTA que debe ser 4228, saltamos al 4229 para el siguiente
  
  3. Resultado:
     - Secuencia continua 4163... con el 4228 reservado para PENTA
     - Sin huecos excepto el salto necesario para mantener el 4228
*/

-- Paso 1: Crear secuencia temporal para la renumeración
CREATE TEMP TABLE IF NOT EXISTS renumber_sequence AS
WITH presupuestos_con_orden AS (
  SELECT 
    id,
    codigo,
    created_at,
    cliente_nombre,
    concepto,
    -- Marcar cuál es el presupuesto que DEBE ser 4228
    CASE 
      WHEN cliente_nombre = 'PENTA SA' 
        AND concepto LIKE '%Mantenimiento Correctivo de Celdas de Media Tensión%Locata%'
        AND created_at::date = '2025-12-27'
      THEN true
      ELSE false
    END as es_el_4228,
    ROW_NUMBER() OVER (ORDER BY created_at) as orden
  FROM presupuestos
  WHERE deleted_at IS NULL
    AND CAST(SUBSTRING(codigo FROM 9) AS INTEGER) >= 4163
),
con_numeros_ajustados AS (
  SELECT 
    id,
    codigo as codigo_actual,
    created_at,
    es_el_4228,
    orden,
    -- Calcular nuevo número:
    -- - Si es el presupuesto especial: 4228
    -- - Si está antes: 4162 + orden
    -- - Si está después: 4162 + orden, pero saltando el 4228
    CASE
      WHEN es_el_4228 THEN 4228
      WHEN orden < (SELECT orden FROM presupuestos_con_orden WHERE es_el_4228)
        THEN 4162 + orden
      ELSE 
        -- Para los presupuestos después del 4228, calculamos:
        -- Si el número calculado sería >= 4228, le sumamos 1 para saltar el 4228
        CASE 
          WHEN (4162 + orden) >= 4228 THEN 4162 + orden + 1
          ELSE 4162 + orden
        END
    END as nuevo_numero
  FROM presupuestos_con_orden
)
SELECT 
  id,
  codigo_actual,
  CONCAT('001-001-', LPAD(nuevo_numero::text, 8, '0')) as codigo_nuevo,
  to_char(created_at, 'MM-DD HH24:MI') as fecha_corta
FROM con_numeros_ajustados
ORDER BY created_at;

-- Paso 2: Aplicar la renumeración
-- Primero mover todos a temporales
UPDATE presupuestos p
SET codigo = CONCAT('TEMP-', p.id::text)
FROM renumber_sequence rs
WHERE p.id = rs.id;

-- Luego aplicar los códigos finales
UPDATE presupuestos p  
SET codigo = rs.codigo_nuevo
FROM renumber_sequence rs
WHERE p.id = rs.id;

-- Limpiar
DROP TABLE renumber_sequence;
