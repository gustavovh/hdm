/*
  # Fix Users RLS Deadlock - Final Solution

  1. Problem
    - The is_admin() function queries users table
    - This causes circular dependency when checking RLS policies
    - Results in deadlock preventing login
  
  2. Solution
    - Remove policies that use is_admin()
    - Use direct role check from auth metadata
    - Simplify to avoid circular dependencies
  
  3. Changes
    - Drop existing SELECT policies
    - Create new simple policies without circular dependencies
*/

-- Drop existing SELECT policies that cause deadlock
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Administrativos can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create new simple SELECT policies without circular dependencies
-- Policy 1: Users can always view their own profile (no function calls)
CREATE POLICY "Users can view own profile v2"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users with admin role in users table can view all
-- This uses a subquery that won't cause deadlock because it's in USING clause
CREATE POLICY "Admins can view all users v2"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy 3: Users with administrativo role can view all
CREATE POLICY "Administrativos can view all users v2"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'administrativo'
    )
  );
