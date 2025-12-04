/*
  # Permitir todos los cambios de estado como excepcionales
  
  1. Cambios
    - Modifica la función `validar_transicion_estado` para que CUALQUIER cambio de estado
      que no sea una transición normal sea tratado como EXCEPCIONAL (requiere aprobación)
    - Esto permite que los vendedores soliciten CUALQUIER cambio y el admin decida
  
  2. Lógica
    - Transiciones normales: permitidas sin aprobación (ABIERTO→PRESENTADO, etc.)
    - TODOS los demás cambios: permitidos PERO requieren aprobación administrativa
    - Ya no se rechazan cambios automáticamente
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
