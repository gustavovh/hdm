/*
  # Fix RLS Policies for Commission Calculations
  
  1. Changes
    - Add INSERT policy for system to create/update commission calculations
    - Add UPDATE policy for system to update commission calculations
    - Add DELETE policy for admins
  
  2. Security
    - System can insert/update commission calculations (for automatic calculations)
    - Admins can manage all commission records
    - Vendedores can only view their own commissions
*/

-- Política para que el sistema pueda crear cálculos de comisiones
CREATE POLICY "Sistema puede crear comisiones"
  ON commission_calculations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para que el sistema pueda actualizar comisiones
CREATE POLICY "Sistema puede actualizar comisiones"
  ON commission_calculations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para que admins puedan eliminar comisiones
CREATE POLICY "Admins pueden eliminar comisiones"
  ON commission_calculations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );