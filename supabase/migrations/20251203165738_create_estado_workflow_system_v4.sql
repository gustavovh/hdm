/*
  # Sistema de Flujo de Estados Encadenados con Aprobaciones

  ## Descripción
  Implementa un sistema de workflow para estados de presupuestos donde:
  - Los estados avanzan secuencialmente: ABIERTO → PRESENTADO → ACEPTADO → EN_EJECUCION → FACTURADO
  - Cambios excepcionales requieren justificación y aprobación administrativa
  - Se registra todo cambio excepcional con auditoría completa

  ## Estados del Sistema
  1. Estados normales (flujo secuencial):
     - ABIERTO (inicial)
     - PRESENTADO
     - ACEPTADO
     - EN_EJECUCION
     - FACTURADO (terminal)
  
  2. Estados excepcionales (requieren aprobación):
     - RECHAZADO (desde ACEPTADO)
     - CANCELADO (desde EN_EJECUCION)
     - INTERVENCION_ORDINARIA (desde EN_EJECUCION)

  ## Nuevas Tablas
  1. `solicitudes_cambio_estado`
     - Registra todas las solicitudes de cambio excepcional
     - Campos: presupuesto, estado origen, estado destino, justificación, estado solicitud
  
  2. `aprobaciones_cambio_estado`
     - Registra aprobaciones/rechazos de administradores
     - Campos: solicitud, aprobador, decisión, comentarios, fecha

  ## Funciones
  1. `validar_transicion_estado()`
     - Valida si una transición es permitida según las reglas del workflow
     - Determina si requiere aprobación administrativa
  
  2. `crear_solicitud_cambio_estado()`
     - Crea una solicitud de cambio excepcional
  
  3. `procesar_solicitud_cambio_estado()`
     - Aprueba o rechaza una solicitud (solo admin)
     - Aplica el cambio de estado si es aprobado

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Vendedores solo ven sus solicitudes
  - Solo administradores pueden aprobar/rechazar
  - Auditoría completa de todos los cambios
*/

-- Crear tabla de solicitudes de cambio de estado
CREATE TABLE IF NOT EXISTS solicitudes_cambio_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  estado_origen budget_status NOT NULL,
  estado_destino budget_status NOT NULL,
  justificacion text NOT NULL,
  solicitante_id uuid NOT NULL REFERENCES users(id),
  estado_solicitud text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_solicitud IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de aprobaciones
CREATE TABLE IF NOT EXISTS aprobaciones_cambio_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES solicitudes_cambio_estado(id) ON DELETE CASCADE,
  aprobador_id uuid NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK (decision IN ('APROBADA', 'RECHAZADA')),
  comentarios text,
  created_at timestamptz DEFAULT now()
);

-- Función para validar transiciones de estado
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
  
  -- Transiciones excepcionales (requieren aprobación)
  ELSIF (p_estado_origen = 'ACEPTADO' AND p_estado_destino = 'RECHAZADO') THEN
    v_permitido := true;
    v_requiere_aprobacion := true;
    v_mensaje := 'Cambio excepcional: requiere aprobación administrativa para rechazar un presupuesto aceptado';
  
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

-- Función para crear solicitud de cambio excepcional
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

  -- Validar la transición
  v_validacion := validar_transicion_estado(v_estado_actual, p_estado_destino);

  IF NOT (v_validacion->>'permitido')::boolean THEN
    RAISE EXCEPTION '%', v_validacion->>'mensaje';
  END IF;

  IF NOT (v_validacion->>'requiere_aprobacion')::boolean THEN
    RAISE EXCEPTION 'Esta transición no requiere solicitud, puede realizarse directamente';
  END IF;

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

-- Función para aprobar/rechazar solicitud (solo admin)
CREATE OR REPLACE FUNCTION procesar_solicitud_cambio_estado(
  p_solicitud_id uuid,
  p_decision text,
  p_comentarios text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud record;
  v_es_admin boolean;
  v_user_id uuid := auth.uid();
BEGIN
  -- Verificar que hay usuario autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar que el usuario es admin
  SELECT role = 'admin' INTO v_es_admin
  FROM users
  WHERE id = v_user_id;

  IF NOT v_es_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden aprobar o rechazar solicitudes';
  END IF;

  -- Validar decisión
  IF p_decision NOT IN ('APROBADA', 'RECHAZADA') THEN
    RAISE EXCEPTION 'Decisión inválida. Debe ser APROBADA o RECHAZADA';
  END IF;

  -- Obtener la solicitud
  SELECT * INTO v_solicitud
  FROM solicitudes_cambio_estado
  WHERE id = p_solicitud_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  IF v_solicitud.estado_solicitud != 'PENDIENTE' THEN
    RAISE EXCEPTION 'La solicitud ya fue procesada anteriormente';
  END IF;

  -- Registrar la aprobación/rechazo
  INSERT INTO aprobaciones_cambio_estado (
    solicitud_id,
    aprobador_id,
    decision,
    comentarios
  )
  VALUES (
    p_solicitud_id,
    v_user_id,
    p_decision,
    p_comentarios
  );

  -- Actualizar estado de la solicitud
  UPDATE solicitudes_cambio_estado
  SET 
    estado_solicitud = p_decision,
    updated_at = now()
  WHERE id = p_solicitud_id;

  -- Si fue aprobada, cambiar el estado del presupuesto
  IF p_decision = 'APROBADA' THEN
    UPDATE presupuestos
    SET 
      estado = v_solicitud.estado_destino,
      updated_at = now()
    WHERE id = v_solicitud.presupuesto_id;
  END IF;

  RETURN true;
END;
$$;

-- Habilitar RLS
ALTER TABLE solicitudes_cambio_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones_cambio_estado ENABLE ROW LEVEL SECURITY;

-- Políticas para solicitudes_cambio_estado
CREATE POLICY "Vendedores pueden ver sus propias solicitudes"
  ON solicitudes_cambio_estado FOR SELECT
  TO authenticated
  USING (
    solicitante_id = auth.uid()
  );

CREATE POLICY "Admins y administrativos pueden ver todas las solicitudes"
  ON solicitudes_cambio_estado FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'administrativo'))
  );

CREATE POLICY "Vendedores pueden crear solicitudes para sus presupuestos"
  ON solicitudes_cambio_estado FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos p
      WHERE p.id = presupuesto_id
      AND p.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "Admins pueden actualizar solicitudes"
  ON solicitudes_cambio_estado FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para aprobaciones_cambio_estado
CREATE POLICY "Usuarios pueden ver aprobaciones de sus solicitudes"
  ON aprobaciones_cambio_estado FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes_cambio_estado s
      WHERE s.id = solicitud_id
      AND s.solicitante_id = auth.uid()
    )
  );

CREATE POLICY "Admins y administrativos pueden ver todas las aprobaciones"
  ON aprobaciones_cambio_estado FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'administrativo'))
  );

CREATE POLICY "Solo admins pueden crear aprobaciones"
  ON aprobaciones_cambio_estado FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_solicitudes_presupuesto ON solicitudes_cambio_estado(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_cambio_estado(estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante ON solicitudes_cambio_estado(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON solicitudes_cambio_estado(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_solicitud ON aprobaciones_cambio_estado(solicitud_id);
