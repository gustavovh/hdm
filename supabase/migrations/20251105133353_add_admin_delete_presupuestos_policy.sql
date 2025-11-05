/*
  # Add Admin Delete Policy for Presupuestos

  1. Changes
    - Add DELETE policy for admins on presupuestos table
    - Add DELETE policy for admins on presupuesto_items table
    - Allows admins to delete any presupuesto and its associated items

  2. Security
    - Only users with role 'admin' can delete presupuestos
    - Ensures proper cleanup of related presupuesto_items through cascade or explicit policy
*/

-- Add DELETE policy for admins on presupuestos
CREATE POLICY "Admins can delete any presupuesto"
  ON presupuestos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add DELETE policy for admins on presupuesto_items
CREATE POLICY "Admins can delete any presupuesto items"
  ON presupuesto_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
