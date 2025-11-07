/*
  # Create ADMINISTRATIVO Role

  1. Changes
    - Add 'administrativo' to UserRole enum type
    - Update RLS policies to grant administrativos access to all presupuestos
    - Administrativos can view all presupuestos but cannot manage users or other admin functions
    - Administrativos can receive sales targets like vendedores
  
  2. Security
    - Administrativos have read access to all presupuestos
    - Administrativos can create and edit presupuestos
    - Administrativos cannot access user management
    - Administrativos cannot approve discount requests
*/

-- Add administrativo to the user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'user_role' AND e.enumlabel = 'administrativo'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'administrativo';
  END IF;
END $$;

-- Update presupuestos SELECT policy to include administrativos
DROP POLICY IF EXISTS "Vendedores can view own presupuestos" ON presupuestos;
CREATE POLICY "Vendedores can view own presupuestos"
ON presupuestos
FOR SELECT
TO authenticated
USING (
  auth.uid() = vendedor_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
);

-- Update presupuestos INSERT policy to include administrativos
DROP POLICY IF EXISTS "Vendedores can create presupuestos" ON presupuestos;
CREATE POLICY "Vendedores can create presupuestos"
ON presupuestos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = vendedor_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
);

-- Update presupuestos UPDATE policy to include administrativos
DROP POLICY IF EXISTS "Users can update presupuestos" ON presupuestos;
CREATE POLICY "Users can update presupuestos"
ON presupuestos
FOR UPDATE
TO authenticated
USING (
  auth.uid() = vendedor_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
)
WITH CHECK (
  auth.uid() = vendedor_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
);

-- Update sales_targets policies to include administrativos
DROP POLICY IF EXISTS "Users can view own targets" ON sales_targets;
CREATE POLICY "Users can view own targets"
ON sales_targets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage all targets" ON sales_targets;
CREATE POLICY "Admins can manage all targets"
ON sales_targets
FOR ALL
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
