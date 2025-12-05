/*
  # Permitir Cancelación Directa desde ABIERTO y PRESENTADO - Versión 2
  
  ## Descripción
  Actualiza el sistema de workflow para permitir que los vendedores puedan cancelar
  presupuestos directamente cuando están en estado ABIERTO o PRESENTADO, sin necesidad
  de aprobación del administrador.
  
  ## Cambios
  Modifica `validar_transicion_estado()` para agregar excepciones específicas:
  - ABIERTO → CANCELADO: transición directa (sin aprobación)
  - PRESENTADO → CANCELADO: transición directa (sin aprobación)
  - CLONADO → CANCELADO: transición directa (sin aprobación)
  - EN_EJECUCION → CANCELADO: sigue requiriendo aprobación (sin cambios)
  
  ## Justificación
  Los presupuestos en estado ABIERTO, CLONADO o PRESENTADO aún no han sido aceptados por el cliente,
  por lo que el vendedor debe poder cancelarlos directamente sin intervención administrativa.
  Solo los presupuestos en ejecución requieren supervisión para cancelarse.
*/

CREATE OR REPLACE FUNCTION validar_transicion_estado(
  p_estado_origen text,
  p_estado_destino text
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
  
  -- NUEVO: Cancelación directa desde ABIERTO, CLONADO y PRESENTADO (sin aprobación)
  ELSIF (p_estado_origen IN ('ABIERTO', 'CLONADO', 'PRESENTADO') AND p_estado_destino = 'CANCELADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := false;
    v_mensaje := 'Cancelación directa permitida desde estado ' || p_estado_origen;

  -- Estados finales que no permiten cambios
  ELSIF p_estado_origen IN ('RECHAZADO', 'CANCELADO', 'ANULADO', 'INTERVENCION_ORDINARIA') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional desde estado final: requiere aprobación administrativa';

  -- TODOS los demás cambios: permitidos PERO requieren aprobación
  ELSE
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional: esta solicitud será enviada al administrador para su aprobación';
  END IF;

  v_resultado := jsonb_build_object(
    'permitido', v_permitido,
    'requiere_aprobacion', v_requiere_aprobacion,
    'mensaje', v_mensaje
  );

  RETURN v_resultado;
END;
$$;