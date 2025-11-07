/*
  # Add Admin View Users Function

  1. Problem
    - Simple RLS policies prevent admins from viewing all users
    - Cannot use policies that query users table (causes recursion)
  
  2. Solution
    - Create SECURITY DEFINER function that bypasses RLS
    - Admins can call this function to get all users
    - Function checks admin status first, then returns users
  
  3. Changes
    - Add get_all_users() function with SECURITY DEFINER
    - Function accessible only to authenticated users
    - Checks if caller is admin before returning data
*/

-- Create function to get all users (for admins only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role user_role,
  avatar_url text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  signature_url text,
  phone text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_role user_role;
BEGIN
  -- Get the role of the caller
  SELECT users.role INTO caller_role
  FROM users
  WHERE users.id = auth.uid();
  
  -- Only admins and administrativos can view all users
  IF caller_role NOT IN ('admin', 'administrativo') THEN
    RAISE EXCEPTION 'Access denied: Only admins and administrativos can view all users';
  END IF;
  
  -- Return all users
  RETURN QUERY
  SELECT 
    users.id,
    users.email,
    users.full_name,
    users.role,
    users.avatar_url,
    users.active,
    users.created_at,
    users.updated_at,
    users.signature_url,
    users.phone
  FROM users
  ORDER BY users.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
