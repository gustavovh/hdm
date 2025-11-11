/*
  # Fix Sistema de Registro de Gestión v2

  1. Problema
    - El trigger existente `registrar_cambio_estado_presupuesto` intenta insertar en presupuesto_actividad
    - Falla cuando auth.uid() es NULL (actualizaciones automáticas)
    - Los valores del enum user_role son lowercase: 'admin', 'vendedor', 'administrativo'

  2. Solución
    - Modificar el trigger para permitir usuario_id NULL cuando sea actualización automática
    - Agregar campos a presupuestos para tracking
    - Crear tabla registro_gestion con políticas correctas

  3. Security
    - RLS habilitado
    - Políticas correctas con valores enum lowercase
*/

-- Agregar los campos nuevos a presupuestos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'ultima_actualizacion_estado'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN ultima_actualizacion_estado timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'dias_notificacion_enviada'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN dias_notificacion_enviada boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'semanas_notificacion_enviada'
  ) THEN
    ALTER TABLE presupuestos ADD COLUMN semanas_notificacion_enviada boolean DEFAULT false;
  END IF;
END $$;

-- Modificar el trigger existente para manejar auth.uid() NULL
CREATE OR REPLACE FUNCTION registrar_cambio_estado_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO presupuesto_actividad (
      presupuesto_id,
      usuario_id,
      tipo_evento,
      estado_anterior,
      estado_nuevo,
      detalle
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.vendedor_id),
      'cambio_estado',
      OLD.estado,
      NEW.estado,
      'Estado cambiado de ' || OLD.estado || ' a ' || NEW.estado
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función para actualizar ultima_actualizacion_estado
CREATE OR REPLACE FUNCTION update_presupuesto_estado_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    NEW.ultima_actualizacion_estado = now();
    NEW.dias_notificacion_enviada = false;
    NEW.semanas_notificacion_enviada = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar timestamp automáticamente (se ejecuta ANTES del otro trigger)
DROP TRIGGER IF EXISTS trigger_update_estado_timestamp ON presupuestos;
CREATE TRIGGER trigger_update_estado_timestamp
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW
  EXECUTE FUNCTION update_presupuesto_estado_timestamp();

-- Actualizar los estados existentes
UPDATE presupuestos 
SET estado = 'ABIERTO'::budget_status,
    ultima_actualizacion_estado = now()
WHERE estado = 'BORRADOR';

UPDATE presupuestos 
SET estado = 'EN_EJECUCION'::budget_status,
    ultima_actualizacion_estado = now()
WHERE estado = 'ACEPTADO';

-- Crear tabla de registro de gestión
CREATE TABLE IF NOT EXISTS registro_gestion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  estado_momento text NOT NULL,
  tipo_notificacion text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_registro_gestion_presupuesto 
  ON registro_gestion(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_registro_gestion_vendedor 
  ON registro_gestion(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_registro_gestion_created 
  ON registro_gestion(created_at DESC);

-- Habilitar RLS
ALTER TABLE registro_gestion ENABLE ROW LEVEL SECURITY;

-- Políticas con valores enum lowercase
DROP POLICY IF EXISTS "Vendedores pueden ver su propio registro de gestión" ON registro_gestion;
CREATE POLICY "Vendedores pueden ver su propio registro de gestión"
  ON registro_gestion FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

DROP POLICY IF EXISTS "Vendedores pueden crear registros de gestión" ON registro_gestion;
CREATE POLICY "Vendedores pueden crear registros de gestión"
  ON registro_gestion FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

DROP POLICY IF EXISTS "Administrativos y admins pueden ver todos los registros" ON registro_gestion;
CREATE POLICY "Administrativos y admins pueden ver todos los registros"
  ON registro_gestion FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrativo', 'admin')
    )
  );

-- Vista de presupuestos anulados
CREATE OR REPLACE VIEW presupuestos_anulados AS
SELECT 
  p.*,
  u.full_name as vendedor_nombre,
  u.email as vendedor_email
FROM presupuestos p
LEFT JOIN users u ON p.vendedor_id = u.id
WHERE p.estado = 'ANULADO'
AND p.deleted_at IS NULL
ORDER BY p.updated_at DESC;

COMMENT ON VIEW presupuestos_anulados IS 'Vista de todos los presupuestos anulados accesible por administrativos y administradores';
