/*
  # Fix RLS policies for productos and categorias

  1. Changes
    - Allow vendedores and admins to create/update productos
    - Allow vendedores and admins to read all productos (including inactive)
    - Keep categorias read-only for non-admins
    - Allow vendedores to create categories if needed

  2. Security
    - Authenticated users (vendedores, admins) can manage productos
    - Only admins can delete productos
    - Maintain data integrity through proper RLS
*/

-- Drop existing policies for productos
DROP POLICY IF EXISTS "Todos pueden leer productos activos" ON productos;
DROP POLICY IF EXISTS "Solo admins pueden crear productos" ON productos;
DROP POLICY IF EXISTS "Solo admins pueden actualizar productos" ON productos;
DROP POLICY IF EXISTS "Solo admins pueden eliminar productos" ON productos;

-- Drop existing policies for categorias
DROP POLICY IF EXISTS "Todos pueden leer categorías activas" ON categorias;
DROP POLICY IF EXISTS "Solo admins pueden crear categorías" ON categorias;
DROP POLICY IF EXISTS "Solo admins pueden actualizar categorías" ON categorias;
DROP POLICY IF EXISTS "Solo admins pueden eliminar categorías" ON categorias;

-- New policies for productos
CREATE POLICY "Usuarios autenticados pueden leer productos"
  ON productos
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Vendedores y admins pueden crear productos"
  ON productos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('vendedor', 'admin')
    )
  );

CREATE POLICY "Vendedores y admins pueden actualizar productos"
  ON productos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('vendedor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('vendedor', 'admin')
    )
  );

CREATE POLICY "Solo admins pueden eliminar productos"
  ON productos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- New policies for categorias
CREATE POLICY "Todos pueden leer categorías"
  ON categorias
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendedores y admins pueden crear categorías"
  ON categorias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('vendedor', 'admin')
    )
  );

CREATE POLICY "Solo admins pueden actualizar categorías"
  ON categorias
  FOR UPDATE
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

CREATE POLICY "Solo admins pueden eliminar categorías"
  ON categorias
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
