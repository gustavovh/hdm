/*
  # Agregar Notificaciones Automáticas para Solicitudes de Cambio de Estado
  
  ## Cambios
  1. Crea un trigger que notifica automáticamente a TODOS los administradores
     cuando se crea una nueva solicitud de cambio de estado
  
  2. La notificación incluye:
     - Datos del presupuesto (código, cliente)
     - Vendedor que solicita el cambio
     - Estados (origen → destino)
     - Justificación
  
  ## Seguridad
  - El trigger se ejecuta con SECURITY DEFINER para poder insertar notificaciones
  - Solo se ejecuta cuando el estado es PENDIENTE
*/

-- Función para notificar a administradores sobre nuevas solicitudes
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

  -- Notificar a TODOS los administradores (admin y administrativo)
  FOR v_admin IN
    SELECT id, full_name, email
    FROM users
    WHERE role IN ('admin', 'administrativo')
    AND deleted_at IS NULL
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
        'El vendedor %s solicita cambiar el presupuesto %s (%s) de "%s" a "%s". Justificación: %s',
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
    'Solicitud de Cambio de Estado Enviada',
    format(
      'Tu solicitud para cambiar el presupuesto %s de "%s" a "%s" fue enviada al administrador y está pendiente de aprobación.',
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

-- Crear trigger para notificar cuando se inserta una nueva solicitud
DROP TRIGGER IF EXISTS trigger_notificar_nueva_solicitud ON solicitudes_cambio_estado;
CREATE TRIGGER trigger_notificar_nueva_solicitud
  AFTER INSERT ON solicitudes_cambio_estado
  FOR EACH ROW
  WHEN (NEW.estado_solicitud = 'PENDIENTE')
  EXECUTE FUNCTION notificar_nueva_solicitud_cambio_estado();

-- Función para notificar cuando se aprueba o rechaza una solicitud
CREATE OR REPLACE FUNCTION notificar_respuesta_solicitud_cambio_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_presupuesto RECORD;
  v_aprobador RECORD;
  v_estado_origen_label text;
  v_estado_destino_label text;
  v_comentarios_text text;
BEGIN
  -- Solo notificar cuando cambia de PENDIENTE a APROBADA o RECHAZADA
  IF OLD.estado_solicitud = 'PENDIENTE' AND NEW.estado_solicitud IN ('APROBADA', 'RECHAZADA') THEN
    -- Obtener datos del presupuesto
    SELECT codigo, cliente_nombre INTO v_presupuesto
    FROM presupuestos
    WHERE id = NEW.presupuesto_id;

    -- Obtener datos del aprobador (el último que aprobó/rechazó)
    SELECT u.full_name, a.comentarios INTO v_aprobador
    FROM aprobaciones_cambio_estado a
    JOIN users u ON a.aprobador_id = u.id
    WHERE a.solicitud_id = NEW.id
    ORDER BY a.created_at DESC
    LIMIT 1;

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

    -- Preparar comentarios
    v_comentarios_text := '';
    IF v_aprobador.comentarios IS NOT NULL AND v_aprobador.comentarios != '' THEN
      v_comentarios_text := format(' Comentarios: %s', v_aprobador.comentarios);
    END IF;

    -- Notificar al solicitante
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
      CASE WHEN NEW.estado_solicitud = 'APROBADA' THEN 'success' ELSE 'error' END,
      format('Solicitud de Cambio de Estado %s', 
        CASE WHEN NEW.estado_solicitud = 'APROBADA' THEN 'Aprobada' ELSE 'Rechazada' END),
      format(
        'Tu solicitud para cambiar el presupuesto %s de "%s" a "%s" fue %s por %s.%s',
        v_presupuesto.codigo,
        v_estado_origen_label,
        v_estado_destino_label,
        CASE WHEN NEW.estado_solicitud = 'APROBADA' THEN 'aprobada' ELSE 'rechazada' END,
        v_aprobador.full_name,
        v_comentarios_text
      ),
      'solicitudes_cambio_estado',
      NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger para notificar cuando se responde una solicitud
DROP TRIGGER IF EXISTS trigger_notificar_respuesta_solicitud ON solicitudes_cambio_estado;
CREATE TRIGGER trigger_notificar_respuesta_solicitud
  AFTER UPDATE ON solicitudes_cambio_estado
  FOR EACH ROW
  WHEN (OLD.estado_solicitud = 'PENDIENTE' AND NEW.estado_solicitud IN ('APROBADA', 'RECHAZADA'))
  EXECUTE FUNCTION notificar_respuesta_solicitud_cambio_estado();
