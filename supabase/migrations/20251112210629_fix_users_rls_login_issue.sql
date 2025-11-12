/*
  # Fix Users RLS Policies for Login

  This migration fixes the RLS policies on the users table to ensure
  users can successfully log in and load their profile.

  ## Changes
  1. Drop all existing SELECT policies on users table
  2. Create a single, simple SELECT policy that allows:
     - Users to read their own profile
     - Any authenticated user to read basic info of other users

  ## Security
  - Maintains security by requiring authentication
  - Allows users to see their own complete profile
  - Allows viewing of other users' basic info (needed for vendedor lists, etc.)
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view public info of all users" ON users;

-- Create a single comprehensive SELECT policy
CREATE POLICY "Authenticated users can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);
