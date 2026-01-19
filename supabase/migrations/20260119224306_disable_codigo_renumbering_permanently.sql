/*
  # DESACTIVAR PERMANENTEMENTE LA RENUMERACIÓN AUTOMÁTICA DE CÓDIGOS
  
  ## PROBLEMA CRÍTICO IDENTIFICADO
  
  Las migraciones de renumeración anteriores (20251119, 20251128, 20260119) causaron 
  un problema CRÍTICO: cambiaron códigos de presupuestos que ya tenían PDFs generados 
  y entregados a clientes.
  
  Ejemplo:
  - Un presupuesto que el cliente tiene como 4228 ahora aparece con otro código en el sistema
  - Presupuestos con códigos 4259, 3087 no existen porque fueron renumerados
  
  ## SOLUCIÓN IMPLEMENTADA
  
  1. El trigger de generación automática de código queda DESACTIVADO PERMANENTEMENTE
  2. Los códigos actuales NO deben cambiar NUNCA MÁS
  3. Los nuevos presupuestos continuarán desde el código máximo actual (4253)
  4. La secuencia está configurada para continuar desde 4254
  
  ## ADVERTENCIA
  
  NUNCA volver a aplicar migraciones de renumeración. Los códigos de presupuesto son 
  INMUTABLES una vez generados y entregados a clientes.
  
  ## Cambios
  
  - Trigger 'trigger_set_presupuesto_codigo' queda DESACTIVADO
  - Secuencia configurada para continuar desde 4254
  - Los códigos existentes permanecen sin cambios
*/

-- El trigger YA está desactivado por la migración anterior
-- Esta migración solo documenta la decisión de mantenerlo desactivado

-- Verificar que la secuencia esté correcta
DO $$
BEGIN
  PERFORM setval('presupuesto_codigo_seq', 
    (SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)), 4253) + 1
     FROM presupuestos
     WHERE codigo ~ '^001-001-[0-9]{8}$'
       AND deleted_at IS NULL));
END $$;