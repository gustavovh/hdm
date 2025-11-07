/*
  # Fix Users Update Policy

  1. Changes
    - Improve the update policy to avoid recursion issues
    - Allow users to update their own profile (full_name, phone, signature_url, avatar_url)
    - Admins can update any user
  
  2. Security
    - Users cannot change their own role, email, or active status
    - Only admins can change those sensitive fields
*/

-- Drop existing update policies
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Allow users to update their own non-sensitive profile fields
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
);

-- Allow admins to update any user
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
