/*
  # Restaurar PENTA al código 4228
  
  1. Problema:
     - La última migración movió PENTA de 4228 a 4229
     - El código 4228 quedó vacío
  
  2. Solución:
     - Mover el presupuesto de PENTA (27/12/2025 14:59:22) de vuelta a 4228
     - Mantener todos los demás en orden secuencial desde 4229
*/

-- Encontrar y mover el presupuesto de PENTA a 4228
UPDATE presupuestos
SET codigo = '001-001-00004228'
WHERE deleted_at IS NULL
  AND cliente_nombre = 'PENTA SA'
  AND concepto LIKE '%Mantenimiento Correctivo de Celdas de Media Tensión%Locata%'
  AND created_at::date = '2025-12-27'
  AND EXTRACT(HOUR FROM created_at) = 14;

-- Verificar que se hizo el cambio
DO $$
DECLARE
  penta_codigo TEXT;
BEGIN
  SELECT codigo INTO penta_codigo
  FROM presupuestos
  WHERE deleted_at IS NULL
    AND cliente_nombre = 'PENTA SA'
    AND concepto LIKE '%Mantenimiento Correctivo de Celdas de Media Tensión%Locata%'
    AND created_at::date = '2025-12-27';
  
  IF penta_codigo = '001-001-00004228' THEN
    RAISE NOTICE 'Corrección exitosa: PENTA está en código 4228';
  ELSE
    RAISE NOTICE 'Código actual de PENTA: %', penta_codigo;
  END IF;
END $$;
