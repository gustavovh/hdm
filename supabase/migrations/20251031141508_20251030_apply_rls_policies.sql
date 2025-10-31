-- ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: users
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can insert users" ON users FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- POLÍTICAS RLS: presupuestos
CREATE POLICY "Vendedores view own budgets" ON presupuestos FOR SELECT TO authenticated USING (vendedor_id = auth.uid() AND estado != 'ANULADO');
CREATE POLICY "Admins view all budgets" ON presupuestos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Vendedores insert own budgets" ON presupuestos FOR INSERT TO authenticated WITH CHECK (vendedor_id = auth.uid());
CREATE POLICY "Vendedores update own budgets" ON presupuestos FOR UPDATE TO authenticated USING (vendedor_id = auth.uid() AND estado != 'ANULADO') WITH CHECK (vendedor_id = auth.uid() AND estado != 'ANULADO');
CREATE POLICY "Admins update all budgets" ON presupuestos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- POLÍTICAS RLS: presupuesto_items
CREATE POLICY "Users view budget items" ON presupuesto_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = presupuesto_items.presupuesto_id AND (presupuestos.vendedor_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))));
CREATE POLICY "Vendedores insert own budget items" ON presupuesto_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = presupuesto_items.presupuesto_id AND presupuestos.vendedor_id = auth.uid()));
CREATE POLICY "Vendedores update own budget items" ON presupuesto_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = presupuesto_items.presupuesto_id AND presupuestos.vendedor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = presupuesto_items.presupuesto_id AND presupuestos.vendedor_id = auth.uid()));
CREATE POLICY "Vendedores delete own budget items" ON presupuesto_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = presupuesto_items.presupuesto_id AND presupuestos.vendedor_id = auth.uid()));

-- POLÍTICAS RLS: solicitudes_descuento
CREATE POLICY "Vendedores view own requests" ON solicitudes_descuento FOR SELECT TO authenticated USING (vendedor_id = auth.uid());
CREATE POLICY "Admins view all requests" ON solicitudes_descuento FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Vendedores create requests" ON solicitudes_descuento FOR INSERT TO authenticated WITH CHECK (vendedor_id = auth.uid() AND EXISTS (SELECT 1 FROM presupuestos WHERE presupuestos.id = solicitudes_descuento.presupuesto_id AND presupuestos.vendedor_id = auth.uid()));
CREATE POLICY "Vendedores cancel pending requests" ON solicitudes_descuento FOR UPDATE TO authenticated USING (vendedor_id = auth.uid() AND estado = 'PENDIENTE') WITH CHECK (vendedor_id = auth.uid() AND estado = 'PENDIENTE');
CREATE POLICY "Admins update all requests" ON solicitudes_descuento FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- POLÍTICAS RLS: auditorias
CREATE POLICY "Admins view audit log" ON auditorias FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "System can insert audit log" ON auditorias FOR INSERT TO authenticated WITH CHECK (true);

-- POLÍTICAS RLS: notificaciones
CREATE POLICY "Users view own notifications" ON notificaciones FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "System creates notifications" ON notificaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON notificaciones FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- POLÍTICAS RLS: configuracion
CREATE POLICY "All users view config" ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins modify config" ON configuracion FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));