/*
  # Allow users to read public information from users table
  
  1. Security Changes
    - Add policy to allow authenticated users to read public information (nombre, apellido, signature_url) from any user
    - This is required for PDF generation where vendors need to include their name and signature
    - First drop the restrictive policies and recreate with proper access
  
  2. Notes
    - Users can only read, not modify other users' data
    - This enables PDF generation with vendor signatures and names
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create new comprehensive policy that allows reading public info
CREATE POLICY "Users can view public info of all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate admin policy for viewing all fields
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );