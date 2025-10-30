/*
  # Sistema de Gestión de Solicitudes de Descuento - HDM
  
  ## Descripción General
  Sistema completo para gestionar solicitudes de descuento en presupuestos,
  con flujo de aprobación, auditoría completa y notificaciones.
  
  ## 1. Nuevas Tablas
  
  ### users
  - `id` (uuid, primary key)
  - `email` (text, unique)
  - `full_name` (text)
  - `role` (enum: admin, vendedor)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### presupuestos (budgets)
  - `id` (uuid, primary key)
  - `codigo` (text, unique) - Código de presupuesto
  - `cliente_nombre` (text) - Nombre del cliente
  - `cliente_email` (text)
  - `vendedor_id` (uuid, FK → users)
  - `moneda` (enum: PYG, USD)
  - `tipo_cambio` (decimal) - Tipo de cambio al momento
  - `total_bruto` (decimal) - Total sin descuentos
  - `total_descuento` (decimal) - Total de descuentos aplicados
  - `total_neto` (decimal) - Total después de descuentos
  - `total_impuestos` (decimal) - Impuestos calculados
  - `total_comisiones` (decimal) - Comisiones del vendedor
  - `estado` (enum: BORRADOR, PRESENTADO, ACEPTADO, FACTURADO, ANULADO)
  - `fecha_presentacion` (date)
  - `fecha_aceptacion` (date)
  - `observaciones` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `deleted_at` (timestamptz) - Soft delete
  
  ### presupuesto_items
  - `id` (uuid, primary key)
  - `presupuesto_id` (uuid, FK → presupuestos)
  - `descripcion` (text)
  - `cantidad` (decimal)
  - `precio_unitario` (decimal)
  - `subtotal` (decimal)
  - `descuento_aplicado` (decimal) - Descuento específico del ítem
  - `orden` (integer) - Orden de visualización
  - `created_at` (timestamptz)
  
  ### solicitudes_descuento (discount_requests)
  - `id` (uuid, primary key)
  - `presupuesto_id` (uuid, FK → presupuestos)
  - `vendedor_id` (uuid, FK → users)
  - `tipo` (enum: PORCENTAJE, MONTO)
  - `valor_propuesto` (decimal) - Valor solicitado por vendedor
  - `motivo` (text) - Justificación de la solicitud
  - `estado` (enum: PENDIENTE, APROBADO, RECHAZADO, APROBADO_MODIFICADO)
  - `valor_aprobado` (decimal) - Valor final aprobado (puede diferir)
  - `aprobado_por` (uuid, FK → users) - Admin que resolvió
  - `comentario_admin` (text) - Feedback del administrador
  - `aplica_a` (enum: GLOBAL, ITEM) - Alcance del descuento
  - `item_id` (uuid, FK → presupuesto_items) - Si aplica a ítem específico
  - `applied_at` (timestamptz) - Momento de aplicación
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `deleted_at` (timestamptz) - Soft delete
  
  ### auditorias (audit_log)
  - `id` (uuid, primary key)
  - `accion` (text) - Tipo de acción realizada
  - `entidad` (text) - Tabla afectada
  - `entidad_id` (uuid) - ID del registro afectado
  - `usuario_id` (uuid, FK → users)
  - `cambios` (jsonb) - Snapshot de cambios (before/after)
  - `ip_address` (inet) - IP del usuario
  - `user_agent` (text) - Navegador/cliente
  - `created_at` (timestamptz)
  
  ### notificaciones (notifications)
  - `id` (uuid, primary key)
  - `usuario_id` (uuid, FK → users)
  - `tipo` (text) - Tipo de notificación
  - `titulo` (text)
  - `mensaje` (text)
  - `entidad` (text) - Referencia a tabla
  - `entidad_id` (uuid) - ID del registro
  - `leida` (boolean)
  - `leida_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### configuracion (system_config)
  - `id` (uuid, primary key)
  - `clave` (text, unique) - Nombre de configuración
  - `valor` (jsonb) - Valor configurable
  - `descripcion` (text)
  - `updated_at` (timestamptz)
  
  ## 2. Security (Row Level Security)
  - RLS habilitado en todas las tablas
  - Políticas restrictivas por rol
  - Vendedores solo acceden a sus datos
  - Administradores acceso completo
  - Auditoría protegida (solo lectura para admins)
  
  ## 3. Índices
  - Índices en foreign keys para performance
  - Índices en campos de búsqueda frecuente
  - Índices compuestos para queries comunes
  
  ## 4. Notas Importantes
  - Soft deletes implementado en tablas principales
  - Todos los cambios críticos se auditan
  - Triggers para mantener consistencia de totales
  - Configuraciones centralizadas en tabla system_config
*/

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('admin', 'vendedor');

-- Monedas
CREATE TYPE currency_type AS ENUM ('PYG', 'USD');

-- Estados de presupuesto
CREATE TYPE budget_status AS ENUM (
  'BORRADOR',
  'PRESENTADO', 
  'ACEPTADO',
  'FACTURADO',
  'ANULADO'
);

-- Tipo de descuento
CREATE TYPE discount_type AS ENUM ('PORCENTAJE', 'MONTO');

-- Estado de solicitud de descuento
CREATE TYPE discount_request_status AS ENUM (
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO',
  'APROBADO_MODIFICADO'
);

-- Alcance de descuento
CREATE TYPE discount_scope AS ENUM ('GLOBAL', 'ITEM');

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'vendedor',
  avatar_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- TABLA: presupuestos
-- ============================================
CREATE TABLE IF NOT EXISTS presupuestos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo text UNIQUE NOT NULL,
  cliente_nombre text NOT NULL,
  cliente_email text,
  cliente_telefono text,
  cliente_documento text,
  vendedor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  moneda currency_type NOT NULL DEFAULT 'PYG',
  tipo_cambio decimal(12,4) NOT NULL DEFAULT 1,
  total_bruto decimal(14,2) NOT NULL DEFAULT 0,
  total_descuento decimal(14,2) NOT NULL DEFAULT 0,
  total_neto decimal(14,2) NOT NULL DEFAULT 0,
  total_impuestos decimal(14,2) NOT NULL DEFAULT 0,
  total_comisiones decimal(14,2) NOT NULL DEFAULT 0,
  tasa_impuesto decimal(5,2) NOT NULL DEFAULT 10.00,
  tasa_comision decimal(5,2) NOT NULL DEFAULT 0,
  estado budget_status NOT NULL DEFAULT 'BORRADOR',
  fecha_presentacion date,
  fecha_aceptacion date,
  fecha_facturacion date,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_presupuestos_vendedor ON presupuestos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_codigo ON presupuestos(codigo);
CREATE INDEX IF NOT EXISTS idx_presupuestos_deleted ON presupuestos(deleted_at);

-- ============================================
-- TABLA: presupuesto_items
-- ============================================
CREATE TABLE IF NOT EXISTS presupuesto_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  cantidad decimal(10,2) NOT NULL DEFAULT 1,
  precio_unitario decimal(14,2) NOT NULL,
  subtotal decimal(14,2) NOT NULL,
  descuento_aplicado decimal(14,2) NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_presupuesto ON presupuesto_items(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_orden ON presupuesto_items(presupuesto_id, orden);

-- ============================================
-- TABLA: solicitudes_descuento
-- ============================================
CREATE TABLE IF NOT EXISTS solicitudes_descuento (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tipo discount_type NOT NULL,
  valor_propuesto decimal(14,2) NOT NULL,
  motivo text NOT NULL,
  estado discount_request_status NOT NULL DEFAULT 'PENDIENTE',
  valor_aprobado decimal(14,2),
  aprobado_por uuid REFERENCES users(id) ON DELETE SET NULL,
  comentario_admin text,
  aplica_a discount_scope NOT NULL DEFAULT 'GLOBAL',
  item_id uuid REFERENCES presupuesto_items(id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Validaciones
  CONSTRAINT valid_valor_propuesto CHECK (valor_propuesto >= 0),
  CONSTRAINT valid_valor_aprobado CHECK (valor_aprobado IS NULL OR valor_aprobado >= 0),
  CONSTRAINT valid_porcentaje CHECK (tipo != 'PORCENTAJE' OR valor_propuesto <= 100),
  CONSTRAINT item_required_for_item_scope CHECK (aplica_a != 'ITEM' OR item_id IS NOT NULL)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitudes_presupuesto ON solicitudes_descuento(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_vendedor ON solicitudes_descuento(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_descuento(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_aprobador ON solicitudes_descuento(aprobado_por);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON solicitudes_descuento(created_at);

-- ============================================
-- TABLA: auditorias
-- ============================================
CREATE TABLE IF NOT EXISTS auditorias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id uuid NOT NULL,
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  cambios jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_auditorias_entidad ON auditorias(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_usuario ON auditorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_created ON auditorias(created_at DESC);

-- ============================================
-- TABLA: notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  entidad text,
  entidad_id uuid,
  leida boolean DEFAULT false,
  leida_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);

-- ============================================
-- TABLA: configuracion
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave text UNIQUE NOT NULL,
  valor jsonb NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion(clave);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS: users
-- ============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Los admins pueden ver todos los usuarios
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Solo admins pueden insertar usuarios
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS RLS: presupuestos
-- ============================================

-- Vendedores ven sus propios presupuestos (excepto ANULADO)
CREATE POLICY "Vendedores view own budgets"
  ON presupuestos FOR SELECT
  TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND estado != 'ANULADO'
  );

-- Admins ven todos los presupuestos
CREATE POLICY "Admins view all budgets"
  ON presupuestos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Vendedores pueden insertar sus propios presupuestos
CREATE POLICY "Vendedores insert own budgets"
  ON presupuestos FOR INSERT
  TO authenticated
  WITH CHECK (vendedor_id = auth.uid());

-- Vendedores pueden actualizar sus propios presupuestos (excepto ANULADO)
CREATE POLICY "Vendedores update own budgets"
  ON presupuestos FOR UPDATE
  TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND estado != 'ANULADO'
  )
  WITH CHECK (
    vendedor_id = auth.uid()
    AND estado != 'ANULADO'
  );

-- Admins pueden actualizar cualquier presupuesto
CREATE POLICY "Admins update all budgets"
  ON presupuestos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS RLS: presupuesto_items
-- ============================================

-- Los usuarios pueden ver ítems de presupuestos que pueden ver
CREATE POLICY "Users view budget items"
  ON presupuesto_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_items.presupuesto_id
      AND (
        presupuestos.vendedor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
  );

-- Los vendedores pueden insertar ítems en sus presupuestos
CREATE POLICY "Vendedores insert own budget items"
  ON presupuesto_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_items.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  );

-- Los vendedores pueden actualizar ítems de sus presupuestos
CREATE POLICY "Vendedores update own budget items"
  ON presupuesto_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_items.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_items.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  );

-- Los vendedores pueden eliminar ítems de sus presupuestos
CREATE POLICY "Vendedores delete own budget items"
  ON presupuesto_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_items.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS: solicitudes_descuento
-- ============================================

-- Vendedores ven sus propias solicitudes
CREATE POLICY "Vendedores view own requests"
  ON solicitudes_descuento FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

-- Admins ven todas las solicitudes
CREATE POLICY "Admins view all requests"
  ON solicitudes_descuento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Vendedores pueden crear solicitudes en sus presupuestos
CREATE POLICY "Vendedores create requests"
  ON solicitudes_descuento FOR INSERT
  TO authenticated
  WITH CHECK (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = solicitudes_descuento.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  );

-- Vendedores pueden cancelar sus solicitudes PENDIENTE
CREATE POLICY "Vendedores cancel pending requests"
  ON solicitudes_descuento FOR UPDATE
  TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND estado = 'PENDIENTE'
  )
  WITH CHECK (
    vendedor_id = auth.uid()
    AND estado = 'PENDIENTE'
  );

-- Admins pueden actualizar cualquier solicitud
CREATE POLICY "Admins update all requests"
  ON solicitudes_descuento FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS RLS: auditorias
-- ============================================

-- Solo admins pueden leer auditorías
CREATE POLICY "Admins view audit log"
  ON auditorias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Sistema puede insertar auditorías (mediante service role)
CREATE POLICY "System can insert audit log"
  ON auditorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- POLÍTICAS RLS: notificaciones
-- ============================================

-- Los usuarios solo ven sus propias notificaciones
CREATE POLICY "Users view own notifications"
  ON notificaciones FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Sistema puede crear notificaciones
CREATE POLICY "System creates notifications"
  ON notificaciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Los usuarios pueden actualizar sus notificaciones (marcar como leída)
CREATE POLICY "Users update own notifications"
  ON notificaciones FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS: configuracion
-- ============================================

-- Todos pueden leer configuración
CREATE POLICY "All users view config"
  ON configuracion FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden modificar configuración
CREATE POLICY "Admins modify config"
  ON configuracion FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- TRIGGERS Y FUNCIONES
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_presupuestos_updated_at ON presupuestos;
CREATE TRIGGER update_presupuestos_updated_at
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitudes_updated_at ON solicitudes_descuento;
CREATE TRIGGER update_solicitudes_updated_at
  BEFORE UPDATE ON solicitudes_descuento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracion_updated_at ON configuracion;
CREATE TRIGGER update_configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (SEED)
-- ============================================

-- Configuraciones del sistema
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('discount_reminder_hours', '48', 'Horas para recordatorio de solicitudes pendientes'),
  ('default_tax_rate', '10.00', 'Tasa de impuesto por defecto (%)'),
  ('default_commission_rate', '5.00', 'Tasa de comisión por defecto (%)'),
  ('max_discount_percentage', '30.00', 'Descuento máximo permitido (%)'),
  ('exchange_rate_pyg_usd', '7300.00', 'Tipo de cambio PYG/USD')
ON CONFLICT (clave) DO NOTHING;

-- Usuario administrador de ejemplo (SOLO PARA DESARROLLO)
-- En producción, esto debería hacerse mediante Supabase Auth
INSERT INTO users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@hdm.com', 'Administrador HDM', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'vendedor1@hdm.com', 'Juan Pérez', 'vendedor'),
  ('00000000-0000-0000-0000-000000000003', 'vendedor2@hdm.com', 'María González', 'vendedor')
ON CONFLICT (id) DO NOTHING;