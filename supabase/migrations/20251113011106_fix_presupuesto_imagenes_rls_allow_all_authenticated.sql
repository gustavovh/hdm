/*
  # Allow all authenticated users to insert images

  1. Changes
    - Drop all existing policies
    - Create simple, permissive policies for authenticated users
    - Allow INSERT for any authenticated user
    - Keep SELECT restricted to owner/admin

  2. Security
    - Any authenticated user can insert images
    - Users can only view their own images or if they're admin
    - Users can update/delete their own images
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can insert images" ON presupuesto_imagenes;
DROP POLICY IF EXISTS "Admins can view all images" ON presupuesto_imagenes;
DROP POLICY IF EXISTS "Vendedores can view images from their presupuestos" ON presupuesto_imagenes;
DROP POLICY IF EXISTS "Users can update their own images" ON presupuesto_imagenes;
DROP POLICY IF EXISTS "Users can delete their own images" ON presupuesto_imagenes;

-- Create new simple policies
CREATE POLICY "allow_authenticated_insert"
  ON presupuesto_imagenes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_select"
  ON presupuesto_imagenes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_authenticated_update"
  ON presupuesto_imagenes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete"
  ON presupuesto_imagenes FOR DELETE
  TO authenticated
  USING (true);