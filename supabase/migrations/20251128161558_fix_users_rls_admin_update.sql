/*
  # Fix Users RLS - Allow Admin Updates

  1. Changes
    - Add policy to allow admins to update any user
    - Keep existing policy for users to update their own profile
  
  2. Security
    - Only admins can update other users
    - Regular users can still update their own profile
*/

-- Add policy for admins to update any user
CREATE POLICY "Admins can update any user"
  ON users
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
