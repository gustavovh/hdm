/*
  # Permitir Cancelación Directa desde ABIERTO y PRESENTADO
  
  ## Descripción
  Actualiza el sistema de workflow para permitir que los vendedores puedan cancelar
  presupuestos directamente cuando están en estado ABIERTO o PRESENTADO, sin necesidad
  de aprobación del administrador.
  
  ## Cambios
  1. Modifica `validar_transicion_estado()` para:
     - ABIERTO → CANCELADO: transición directa (sin aprobación)
     - PRESENTADO → CANCELADO: transición directa (sin aprobación)
     - EN_EJECUCION → CANCELADO: sigue requiriendo aprobación (sin cambios)
  
  ## Justificación
  Los presupuestos en estado ABIERTO o PRESENTADO aún no han sido aceptados por el cliente,
  por lo que el vendedor debe poder cancelarlos directamente sin intervención administrativa.
  Solo los presupuestos en ejecución requieren supervisión para cancelarse.
*/

-- Actualizar función de validación de transiciones
CREATE OR REPLACE FUNCTION validar_transicion_estado(
  p_estado_origen budget_status,
  p_estado_destino budget_status
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_resultado jsonb;
  v_permitido boolean := false;
  v_requiere_aprobacion boolean := false;
  v_mensaje text := '';
BEGIN
  -- Mismo estado (no hacer nada)
  IF p_estado_origen = p_estado_destino THEN
    v_permitido := false;
    v_requiere_aprobacion := false;
    v_mensaje := 'El presupuesto ya está en ese estado';
    
  -- Transiciones normales (no requieren aprobación)
  ELSIF (p_estado_origen = 'ABIERTO' AND p_estado_destino = 'PRESENTADO') OR
        (p_estado_origen = 'CLONADO' AND p_estado_destino = 'PRESENTADO') OR
        (p_estado_origen = 'PRESENTADO' AND p_estado_destino = 'ACEPTADO') OR
        (p_estado_origen = 'ACEPTADO' AND p_estado_destino = 'EN_EJECUCION') OR
        (p_estado_origen = 'EN_EJECUCION' AND p_estado_destino = 'FACTURADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := false;
    v_mensaje := 'Transición normal permitida';
  
  -- NUEVO: Cancelación directa desde ABIERTO (sin aprobación)
  ELSIF (p_estado_origen = 'ABIERTO' AND p_estado_destino = 'CANCELADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := false;
    v_mensaje := 'Cancelación directa permitida desde estado ABIERTO';
  
  -- NUEVO: Cancelación directa desde PRESENTADO (sin aprobación)
  ELSIF (p_estado_origen = 'PRESENTADO' AND p_estado_destino = 'CANCELADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := false;
    v_mensaje := 'Cancelación directa permitida desde estado PRESENTADO';
  
  -- NUEVO: Cancelación directa desde CLONADO (sin aprobación)
  ELSIF (p_estado_origen = 'CLONADO' AND p_estado_destino = 'CANCELADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := false;
    v_mensaje := 'Cancelación directa permitida desde estado CLONADO';
  
  -- Transiciones excepcionales (requieren aprobación)
  ELSIF (p_estado_origen = 'ACEPTADO' AND p_estado_destino = 'RECHAZADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional: requiere aprobación administrativa para rechazar un presupuesto aceptado';
  
  -- Cancelación desde EN_EJECUCION sigue requiriendo aprobación
  ELSIF (p_estado_origen = 'EN_EJECUCION' AND p_estado_destino = 'CANCELADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional: requiere aprobación administrativa para cancelar un presupuesto en ejecución';
  
  ELSIF (p_estado_origen = 'EN_EJECUCION' AND p_estado_destino = 'INTERVENCION_ORDINARIA') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional: requiere aprobación administrativa para intervención ordinaria';
  
  -- Cambios desde FACTURADO (siempre excepcionales)
  ELSIF (p_estado_origen = 'FACTURADO' AND p_estado_destino != 'FACTURADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional desde FACTURADO: requiere aprobación administrativa';
  
  -- Cualquier retroceso o cambio no contemplado
  ELSE
    v_permitido := false;
    v_requiere_aprobacion := false;
    v_mensaje := 'Transición no permitida. Los presupuestos solo pueden avanzar secuencialmente: ABIERTO → PRESENTADO → ACEPTADO → EN EJECUCIÓN → FACTURADO. Para cambios excepcionales, contacte al administrador.';
  END IF;

  v_resultado := jsonb_build_object(
    'permitido', v_permitido,
    'requiere_aprobacion', v_requiere_aprobacion,
    'mensaje', v_mensaje
  );

  RETURN v_resultado;
END;
$$;