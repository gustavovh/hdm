/*
  # Renumerar Presupuestos al Formato 001-001-00002032

  1. Objetivo
    - Actualizar todos los códigos de presupuestos existentes al nuevo formato
    - Formato: 001-001-00002032 (3 dígitos-3 dígitos-8 dígitos)
    
  2. Proceso
    - Asignar números secuenciales comenzando desde 001-001-00002032
    - Ordenar por fecha de creación (created_at)
    - Actualizar la función generate_presupuesto_codigo para usar el nuevo formato

  3. Notas
    - Se mantiene el orden cronológico de creación
    - Los presupuestos eliminados (deleted_at IS NOT NULL) no se modifican
*/

-- Crear tabla temporal con numeración secuencial
CREATE TEMP TABLE temp_presupuestos_renumerados AS
SELECT 
  id,
  ROW_NUMBER() OVER (ORDER BY created_at ASC) as numero_secuencial
FROM presupuestos
WHERE deleted_at IS NULL
ORDER BY created_at ASC;

-- Actualizar códigos con el nuevo formato
UPDATE presupuestos p
SET codigo = '001-001-' || LPAD((2031 + tr.numero_secuencial)::text, 8, '0')
FROM temp_presupuestos_renumerados tr
WHERE p.id = tr.id;

-- Eliminar tabla temporal
DROP TABLE temp_presupuestos_renumerados;

-- Actualizar la función generate_presupuesto_codigo para usar el nuevo formato
CREATE OR REPLACE FUNCTION generate_presupuesto_codigo()
RETURNS TEXT AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_codigo TEXT;
BEGIN
  -- Obtener el último número del formato 001-001-XXXXXXXX
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(codigo FROM '\d{8}$') AS INTEGER
      )
    ), 
    2031
  ) INTO ultimo_numero
  FROM presupuestos
  WHERE codigo ~ '^001-001-\d{8}$'
  AND deleted_at IS NULL;
  
  -- Incrementar y generar nuevo código
  nuevo_codigo := '001-001-' || LPAD((ultimo_numero + 1)::text, 8, '0');
  
  RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_presupuesto_codigo() IS 'Genera códigos de presupuesto en formato 001-001-XXXXXXXX secuencial';
