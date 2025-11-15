/*
  # Actualizar presupuestos BORRADOR a CLONADO

  ## Cambios aplicados:
  
  1. **Actualizar presupuestos existentes**
    - Cambiar todos los presupuestos en estado 'BORRADOR' a 'CLONADO'
    
  2. **Actualizar comentario de la columna**
    - Documentar que BORRADOR está deprecado
    
  ## Flujo de estados actualizado:
    CLONADO → ABIERTO → PRESENTADO → ACEPTADO → EN_EJECUCION → FACTURADO
    También puede ir a: RECHAZADO, CANCELADO, ANULADO
*/

-- Actualizar todos los presupuestos en estado BORRADOR a CLONADO
UPDATE presupuestos 
SET estado = 'CLONADO' 
WHERE estado = 'BORRADOR';

-- Agregar comentario explicativo
COMMENT ON COLUMN presupuestos.estado IS 'Estado del presupuesto: CLONADO (inicial al clonar), ABIERTO (guardado), PRESENTADO, ACEPTADO, EN_EJECUCION, FACTURADO, RECHAZADO, CANCELADO, ANULADO. BORRADOR está deprecado y no debe usarse.';
