/*
  # Fix presupuesto_items RLS for Administrativo users
  
  1. Changes
    - Drop existing policies for presupuesto_items
    - Create new simplified policies that include 'administrativo' role
    - Allow admins and administrativos to view, insert, update, and delete all items
    - Allow vendedores to manage their own items
  
  2. Security
    - Maintains separation: vendedores only see their own items
    - Admins and administrativos have full access
    - All policies properly check authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view budget items" ON presupuesto_items;
DROP POLICY IF EXISTS "Vendedores insert own budget items" ON presupuesto_items;
DROP POLICY IF EXISTS "Vendedores update own budget items" ON presupuesto_items;
DROP POLICY IF EXISTS "Vendedores delete own budget items" ON presupuesto_items;

-- Create new simplified policies

-- SELECT: Allow vendedores to see their own items, admins and administrativos see all
CREATE POLICY "Users view budget items" 
  ON presupuesto_items 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM presupuestos p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE p.id = presupuesto_items.presupuesto_id
        AND (
          p.vendedor_id = auth.uid() 
          OR u.role IN ('admin', 'administrativo')
        )
    )
  );

-- INSERT: Allow vendedores to insert into their own budgets, admins and administrativos insert anywhere
CREATE POLICY "Users insert budget items" 
  ON presupuesto_items 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM presupuestos p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE p.id = presupuesto_items.presupuesto_id
        AND (
          p.vendedor_id = auth.uid() 
          OR u.role IN ('admin', 'administrativo')
        )
    )
  );

-- UPDATE: Allow vendedores to update their own items, admins and administrativos update all
CREATE POLICY "Users update budget items" 
  ON presupuesto_items 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM presupuestos p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE p.id = presupuesto_items.presupuesto_id
        AND (
          p.vendedor_id = auth.uid() 
          OR u.role IN ('admin', 'administrativo')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM presupuestos p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE p.id = presupuesto_items.presupuesto_id
        AND (
          p.vendedor_id = auth.uid() 
          OR u.role IN ('admin', 'administrativo')
        )
    )
  );

-- DELETE: Allow vendedores to delete their own items, admins and administrativos delete all
CREATE POLICY "Users delete budget items" 
  ON presupuesto_items 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM presupuestos p
      INNER JOIN users u ON u.id = auth.uid()
      WHERE p.id = presupuesto_items.presupuesto_id
        AND (
          p.vendedor_id = auth.uid() 
          OR u.role IN ('admin', 'administrativo')
        )
    )
  );