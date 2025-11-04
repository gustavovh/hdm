/*
  # Sistema de Comisiones por Objetivos y Tramos

  1. Nueva Tabla: commission_tiers
    - Define los tramos de comisión basados en objetivos mensuales
    - Permite configurar diferentes tasas por rango de ventas

  2. Nueva Tabla: vendedor_objectives
    - Objetivos mensuales asignados a cada vendedor
    - Histórico de objetivos por período

  3. Nueva Tabla: commission_calculations
    - Registro de cálculos de comisiones mensuales
    - Auditoría de comisiones pagadas

  4. Notas
    - Sistema flexible que permite ajustar tasas sin cambiar código
    - Histórico completo de comisiones calculadas
    - Soporta múltiples períodos y monedas
*/

-- ============================================
-- TABLA: commission_tiers (Tramos de Comisión)
-- ============================================
CREATE TABLE IF NOT EXISTS commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  min_amount decimal(14,2) NOT NULL,
  max_amount decimal(14,2),
  tasa_comision decimal(5,2) NOT NULL,
  moneda currency_type NOT NULL DEFAULT 'PYG',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_min_max CHECK (max_amount IS NULL OR max_amount > min_amount),
  CONSTRAINT valid_tasa CHECK (tasa_comision >= 0 AND tasa_comision <= 100)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commission_tiers_activo ON commission_tiers(activo);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_amounts ON commission_tiers(min_amount, max_amount);

-- ============================================
-- TABLA: vendedor_objectives (Objetivos por Vendedor)
-- ============================================
CREATE TABLE IF NOT EXISTS vendedor_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  periodo_anio integer NOT NULL,
  periodo_mes integer NOT NULL,
  objetivo_monto decimal(14,2) NOT NULL,
  moneda currency_type NOT NULL DEFAULT 'PYG',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_mes CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
  CONSTRAINT valid_anio CHECK (periodo_anio >= 2020),
  CONSTRAINT unique_vendedor_periodo UNIQUE (vendedor_id, periodo_anio, periodo_mes)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendedor_objectives_vendedor ON vendedor_objectives(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_objectives_periodo ON vendedor_objectives(periodo_anio, periodo_mes);

-- ============================================
-- TABLA: commission_calculations (Cálculos de Comisión)
-- ============================================
CREATE TABLE IF NOT EXISTS commission_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  periodo_anio integer NOT NULL,
  periodo_mes integer NOT NULL,
  monto_vendido decimal(14,2) NOT NULL DEFAULT 0,
  objetivo_monto decimal(14,2),
  porcentaje_cumplimiento decimal(5,2),
  tier_aplicado_id uuid REFERENCES commission_tiers(id) ON DELETE SET NULL,
  tasa_comision_aplicada decimal(5,2) NOT NULL,
  monto_comision decimal(14,2) NOT NULL,
  moneda currency_type NOT NULL DEFAULT 'PYG',
  presupuestos_incluidos jsonb,
  calculado_at timestamptz DEFAULT now(),
  pagado boolean DEFAULT false,
  pagado_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_vendedor_calculo_periodo UNIQUE (vendedor_id, periodo_anio, periodo_mes)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commission_calculations_vendedor ON commission_calculations(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_periodo ON commission_calculations(periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_pagado ON commission_calculations(pagado);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedor_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_calculations ENABLE ROW LEVEL SECURITY;

-- Políticas: commission_tiers
CREATE POLICY "Todos pueden ver tiers activos"
  ON commission_tiers FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "Admins gestionan tiers"
  ON commission_tiers FOR ALL
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

-- Políticas: vendedor_objectives
CREATE POLICY "Vendedores ven sus objetivos"
  ON vendedor_objectives FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Admins ven todos los objetivos"
  ON vendedor_objectives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins gestionan objetivos"
  ON vendedor_objectives FOR ALL
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

-- Políticas: commission_calculations
CREATE POLICY "Vendedores ven sus comisiones"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (vendedor_id = auth.uid());

CREATE POLICY "Admins ven todas las comisiones"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins gestionan comisiones"
  ON commission_calculations FOR ALL
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
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_commission_tiers_updated_at ON commission_tiers;
CREATE TRIGGER update_commission_tiers_updated_at
  BEFORE UPDATE ON commission_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendedor_objectives_updated_at ON vendedor_objectives;
CREATE TRIGGER update_vendedor_objectives_updated_at
  BEFORE UPDATE ON vendedor_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (Tramos de Ejemplo)
-- ============================================

-- Tramos de comisión por defecto (en PYG)
INSERT INTO commission_tiers (nombre, descripcion, min_amount, max_amount, tasa_comision, moneda) VALUES
  ('Bronce', 'Ventas hasta 50 millones', 0, 50000000, 3.0, 'PYG'),
  ('Plata', 'Ventas de 50 a 100 millones', 50000000, 100000000, 5.0, 'PYG'),
  ('Oro', 'Ventas de 100 a 200 millones', 100000000, 200000000, 7.0, 'PYG'),
  ('Platino', 'Ventas superiores a 200 millones', 200000000, NULL, 10.0, 'PYG')
ON CONFLICT DO NOTHING;

-- Tramos de comisión en USD
INSERT INTO commission_tiers (nombre, descripcion, min_amount, max_amount, tasa_comision, moneda) VALUES
  ('Bronce USD', 'Ventas hasta $10,000', 0, 10000, 3.0, 'USD'),
  ('Plata USD', 'Ventas de $10,000 a $25,000', 10000, 25000, 5.0, 'USD'),
  ('Oro USD', 'Ventas de $25,000 a $50,000', 25000, 50000, 7.0, 'USD'),
  ('Platino USD', 'Ventas superiores a $50,000', 50000, NULL, 10.0, 'USD')
ON CONFLICT DO NOTHING;
