/*
  # Actualizar función crear_solicitud_cambio_estado para usar text
  
  1. Problema
    - La función crear_solicitud_cambio_estado espera p_estado_destino de tipo budget_status (enum)
    - El frontend está pasando strings
    - Esto causa un error de tipo
  
  2. Solución
    - Eliminar la función existente
    - Recrearla con parámetro p_estado_destino de tipo text
    - Convertir internamente a budget_status si es necesario
*/

-- Eliminar la función existente
DROP FUNCTION IF EXISTS crear_solicitud_cambio_estado(uuid, budget_status, text);

-- Recrear la función con p_estado_destino como text
CREATE OR REPLACE FUNCTION crear_solicitud_cambio_estado(
  p_presupuesto_id uuid,
  p_estado_destino text,
  p_justificacion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud_id uuid;
  v_estado_actual text;
  v_solicitante_id uuid;
BEGIN
  -- Obtener el estado actual del presupuesto
  SELECT estado INTO v_estado_actual
  FROM presupuestos
  WHERE id = p_presupuesto_id;

  IF v_estado_actual IS NULL THEN
    RAISE EXCEPTION 'Presupuesto no encontrado';
  END IF;

  -- Obtener el ID del usuario autenticado
  v_solicitante_id := auth.uid();

  IF v_solicitante_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Crear la solicitud de cambio de estado
  INSERT INTO solicitudes_cambio_estado (
    presupuesto_id,
    estado_origen,
    estado_destino,
    solicitante_id,
    justificacion,
    estado_solicitud
  ) VALUES (
    p_presupuesto_id,
    v_estado_actual::budget_status,
    p_estado_destino::budget_status,
    v_solicitante_id,
    p_justificacion,
    'PENDIENTE'
  )
  RETURNING id INTO v_solicitud_id;

  RETURN v_solicitud_id;
END;
$$;
