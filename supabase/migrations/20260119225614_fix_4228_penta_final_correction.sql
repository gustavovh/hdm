/*
  # Corrección final: Presupuesto 4228 debe ser PENTA SA
  
  1. Situación actual:
     - 4167: PENTA SA - Mantenimiento Correctivo de Celdas (fecha 27/12/2025) ✓ Correcto según PDF
     - 4228: CONSORCIO ANCORA - Adecuación de Barra (fecha 14/01/2026) ✗ Incorrecto
  
  2. Solución:
     - El PDF muestra que el código 4228 DEBE ser el presupuesto de PENTA (27/12/2025)
     - Intercambiar los códigos: PENTA va a 4228, CONSORCIO ANCORA va a 4167
  
  3. NO necesitamos renumerar nada más - solo intercambiar estos dos códigos específicos
*/

-- Identificar los IDs de los presupuestos a intercambiar
DO $$
DECLARE
  penta_id uuid;
  ancora_id uuid;
BEGIN
  -- Encontrar el presupuesto de PENTA que debe ser 4228
  SELECT id INTO penta_id
  FROM presupuestos
  WHERE deleted_at IS NULL
    AND cliente_nombre = 'PENTA SA'
    AND concepto LIKE '%Mantenimiento Correctivo de Celdas de Media Tensión%'
    AND created_at::date = '2025-12-27'::date;
  
  -- Encontrar el presupuesto de ANCORA que está en 4228
  SELECT id INTO ancora_id
  FROM presupuestos
  WHERE deleted_at IS NULL
    AND codigo = '001-001-00004228';
  
  -- Intercambiar los códigos usando códigos temporales
  -- Paso 1: PENTA a temporal
  UPDATE presupuestos
  SET codigo = 'TEMP-4228'
  WHERE id = penta_id;
  
  -- Paso 2: ANCORA a 4167
  UPDATE presupuestos
  SET codigo = '001-001-00004167'
  WHERE id = ancora_id;
  
  -- Paso 3: PENTA a 4228
  UPDATE presupuestos
  SET codigo = '001-001-00004228'
  WHERE id = penta_id;
  
  RAISE NOTICE 'Intercambio completado: PENTA ahora en 4228, ANCORA en 4167';
END $$;
