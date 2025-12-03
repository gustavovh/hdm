/*
  # Permitir Solicitudes de Cualquier Cambio No Normal
  
  ## Cambios
  Modifica la función `crear_solicitud_cambio_estado` para permitir crear solicitudes
  de cambio de estado para CUALQUIER transición que no sea normal (secuencial permitida).
  
  ## Lógica
  - Si la transición es normal y permitida → Error (no necesita solicitud)
  - Si la transición NO es normal (retroceso, excepcional, etc.) → Crear solicitud
  - El administrador decide si aprueba o rechaza la solicitud
  
  ## Justificación
  Los usuarios deben poder solicitar CUALQUIER cambio de estado al administrador,
  incluso los que normalmente están prohibidos (como PRESENTADO → ABIERTO).
  El administrador tiene la autoridad final para aprobar o rechazar.
*/

CREATE OR REPLACE FUNCTION crear_solicitud_cambio_estado(
  p_presupuesto_id uuid,
  p_estado_destino budget_status,
  p_justificacion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud_id uuid;
  v_estado_actual budget_status;
  v_validacion jsonb;
  v_user_id uuid := auth.uid();
BEGIN
  -- Verificar que hay usuario autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener estado actual del presupuesto
  SELECT estado INTO v_estado_actual
  FROM presupuestos
  WHERE id = p_presupuesto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Presupuesto no encontrado';
  END IF;

  -- No permitir solicitud si el estado es el mismo
  IF v_estado_actual = p_estado_destino THEN
    RAISE EXCEPTION 'El presupuesto ya está en ese estado';
  END IF;

  -- Validar la transición
  v_validacion := validar_transicion_estado(v_estado_actual, p_estado_destino);

  -- Si es una transición normal permitida que NO requiere aprobación, no crear solicitud
  IF (v_validacion->>'permitido')::boolean AND NOT (v_validacion->>'requiere_aprobacion')::boolean THEN
    RAISE EXCEPTION 'Esta transición puede realizarse directamente sin solicitud. Use el cambio de estado normal.';
  END IF;

  -- Para CUALQUIER otro caso (no permitido o requiere aprobación), crear solicitud
  -- Verificar si ya existe una solicitud pendiente para este presupuesto
  IF EXISTS (
    SELECT 1 FROM solicitudes_cambio_estado
    WHERE presupuesto_id = p_presupuesto_id
    AND estado_solicitud = 'PENDIENTE'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente para este presupuesto';
  END IF;

  -- Crear la solicitud
  INSERT INTO solicitudes_cambio_estado (
    presupuesto_id,
    estado_origen,
    estado_destino,
    justificacion,
    solicitante_id
  )
  VALUES (
    p_presupuesto_id,
    v_estado_actual,
    p_estado_destino,
    p_justificacion,
    v_user_id
  )
  RETURNING id INTO v_solicitud_id;

  RETURN v_solicitud_id;
END;
$$;
