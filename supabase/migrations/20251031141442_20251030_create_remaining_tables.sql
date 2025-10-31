-- TABLA: presupuestos
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

CREATE INDEX IF NOT EXISTS idx_presupuestos_vendedor ON presupuestos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_codigo ON presupuestos(codigo);
CREATE INDEX IF NOT EXISTS idx_presupuestos_deleted ON presupuestos(deleted_at);

-- TABLA: presupuesto_items
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

CREATE INDEX IF NOT EXISTS idx_presupuesto_items_presupuesto ON presupuesto_items(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_orden ON presupuesto_items(presupuesto_id, orden);

-- TABLA: solicitudes_descuento
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
  CONSTRAINT valid_valor_propuesto CHECK (valor_propuesto >= 0),
  CONSTRAINT valid_valor_aprobado CHECK (valor_aprobado IS NULL OR valor_aprobado >= 0),
  CONSTRAINT valid_porcentaje CHECK (tipo != 'PORCENTAJE' OR valor_propuesto <= 100),
  CONSTRAINT item_required_for_item_scope CHECK (aplica_a != 'ITEM' OR item_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_presupuesto ON solicitudes_descuento(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_vendedor ON solicitudes_descuento(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_descuento(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_aprobador ON solicitudes_descuento(aprobado_por);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created ON solicitudes_descuento(created_at);

-- TABLA: auditorias
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

CREATE INDEX IF NOT EXISTS idx_auditorias_entidad ON auditorias(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_usuario ON auditorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_created ON auditorias(created_at DESC);

-- TABLA: notificaciones
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

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);

-- TABLA: configuracion
CREATE TABLE IF NOT EXISTS configuracion (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave text UNIQUE NOT NULL,
  valor jsonb NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion(clave);