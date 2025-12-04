/*
  # Fix Trigger de Notificaciones - Remover deleted_at de users
  
  ## Cambios
  - La tabla users no tiene campo deleted_at, solo tiene active
  - Actualiza el trigger para usar active = true en lugar de deleted_at IS NULL
*/

-- Función corregida para notificar a administradores sobre nuevas solicitudes
CREATE OR REPLACE FUNCTION notificar_nueva_solicitud_cambio_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_presupuesto RECORD;
  v_solicitante RECORD;
  v_admin RECORD;
  v_estado_origen_label text;
  v_estado_destino_label text;
BEGIN
  -- Obtener datos del presupuesto
  SELECT codigo, cliente_nombre INTO v_presupuesto
  FROM presupuestos
  WHERE id = NEW.presupuesto_id;

  -- Obtener datos del solicitante
  SELECT full_name, email INTO v_solicitante
  FROM users
  WHERE id = NEW.solicitante_id;

  -- Obtener labels legibles para los estados
  v_estado_origen_label := CASE NEW.estado_origen
    WHEN 'ABIERTO' THEN 'Abierto'
    WHEN 'CLONADO' THEN 'Clonado'
    WHEN 'PRESENTADO' THEN 'Presentado'
    WHEN 'ACEPTADO' THEN 'Aceptado'
    WHEN 'EN_EJECUCION' THEN 'En Ejecución'
    WHEN 'FACTURADO' THEN 'Facturado'
    WHEN 'RECHAZADO' THEN 'Rechazado'
    WHEN 'CANCELADO' THEN 'Cancelado'
    WHEN 'ANULADO' THEN 'Anulado'
    WHEN 'INTERVENCION_ORDINARIA' THEN 'Intervención Ordinaria'
    ELSE NEW.estado_origen::text
  END;

  v_estado_destino_label := CASE NEW.estado_destino
    WHEN 'ABIERTO' THEN 'Abierto'
    WHEN 'CLONADO' THEN 'Clonado'
    WHEN 'PRESENTADO' THEN 'Presentado'
    WHEN 'ACEPTADO' THEN 'Aceptado'
    WHEN 'EN_EJECUCION' THEN 'En Ejecución'
    WHEN 'FACTURADO' THEN 'Facturado'
    WHEN 'RECHAZADO' THEN 'Rechazado'
    WHEN 'CANCELADO' THEN 'Cancelado'
    WHEN 'ANULADO' THEN 'Anulado'
    WHEN 'INTERVENCION_ORDINARIA' THEN 'Intervención Ordinaria'
    ELSE NEW.estado_destino::text
  END;

  -- Notificar a TODOS los administradores activos (admin y administrativo)
  FOR v_admin IN
    SELECT id, full_name, email
    FROM users
    WHERE role IN ('admin', 'administrativo')
    AND (active IS NULL OR active = true)
  LOOP
    -- Crear notificación para cada administrador
    INSERT INTO notificaciones (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      entidad,
      entidad_id,
      leida
    )
    VALUES (
      v_admin.id,
      'warning',
      'Nueva Solicitud de Cambio de Estado',
      format(
        '🔔 El vendedor %s solicita cambiar el presupuesto %s (%s) de "%s" a "%s". Justificación: %s',
        v_solicitante.full_name,
        v_presupuesto.codigo,
        v_presupuesto.cliente_nombre,
        v_estado_origen_label,
        v_estado_destino_label,
        NEW.justificacion
      ),
      'solicitudes_cambio_estado',
      NEW.id,
      false
    );
  END LOOP;

  -- También notificar al solicitante que su solicitud fue creada
  INSERT INTO notificaciones (
    usuario_id,
    tipo,
    titulo,
    mensaje,
    entidad,
    entidad_id,
    leida
  )
  VALUES (
    NEW.solicitante_id,
    'info',
    'Solicitud Enviada',
    format(
      '✅ Tu solicitud para cambiar el presupuesto %s de "%s" a "%s" fue enviada al administrador y está pendiente de aprobación.',
      v_presupuesto.codigo,
      v_estado_origen_label,
      v_estado_destino_label
    ),
    'solicitudes_cambio_estado',
    NEW.id,
    false
  );

  RETURN NEW;
END;
$$;
