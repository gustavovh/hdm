/*
  # Fix Users RLS - Simple Non-Recursive Solution

  1. Problem
    - Any policy that queries users table creates infinite recursion
    - Even EXISTS subqueries cause this issue
  
  2. Solution
    - Use ONLY self-referential policies (auth.uid() = id)
    - Remove all policies that query the users table
    - This allows users to see their own profile immediately after login
  
  3. Security Note
    - This is more restrictive but prevents deadlock
    - Admins will need separate logic to view other users
*/

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Admins can view all users v2" ON users;
DROP POLICY IF EXISTS "Administrativos can view all users v2" ON users;
DROP POLICY IF EXISTS "Users can view own profile v2" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create single simple policy: users can only see their own profile
CREATE POLICY "Users can view own profile only"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create single simple policy: users can only update their own profile  
CREATE POLICY "Users can update own profile only"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
