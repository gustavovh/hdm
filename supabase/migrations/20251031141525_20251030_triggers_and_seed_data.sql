-- TRIGGERS Y FUNCIONES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_presupuestos_updated_at ON presupuestos;
CREATE TRIGGER update_presupuestos_updated_at BEFORE UPDATE ON presupuestos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitudes_updated_at ON solicitudes_descuento;
CREATE TRIGGER update_solicitudes_updated_at BEFORE UPDATE ON solicitudes_descuento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracion_updated_at ON configuracion;
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DATOS INICIALES (SEED)
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('discount_reminder_hours', '48', 'Horas para recordatorio de solicitudes pendientes'),
  ('default_tax_rate', '10.00', 'Tasa de impuesto por defecto (%)'),
  ('default_commission_rate', '5.00', 'Tasa de comisión por defecto (%)'),
  ('max_discount_percentage', '30.00', 'Descuento máximo permitido (%)'),
  ('exchange_rate_pyg_usd', '7300.00', 'Tipo de cambio PYG/USD')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@hdm.com', 'Administrador HDM', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'vendedor1@hdm.com', 'Juan Pérez', 'vendedor'),
  ('00000000-0000-0000-0000-000000000003', 'vendedor2@hdm.com', 'María González', 'vendedor')
ON CONFLICT (id) DO NOTHING;