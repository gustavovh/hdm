/*
  # Fix update_user_as_admin Function - Admin Check

  1. Changes
    - Fix the admin check logic in update_user_as_admin
    - Use SECURITY DEFINER to avoid RLS issues when checking role
  
  2. Security
    - Verify admin status correctly
    - Allow users to update their own profile
*/

-- Drop and recreate the function with fixed admin check
DROP FUNCTION IF EXISTS update_user_as_admin(uuid, text, user_role);

CREATE OR REPLACE FUNCTION update_user_as_admin(
  target_user_id uuid,
  new_full_name text DEFAULT NULL,
  new_role user_role DEFAULT NULL
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
  updated_user users;
  caller_id uuid;
BEGIN
  -- Get the authenticated user ID
  caller_id := auth.uid();
  
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the caller's role using direct query (no RLS involved in SECURITY DEFINER)
  SELECT role INTO caller_role
  FROM users
  WHERE id = caller_id;

  -- Allow if: caller is admin OR caller is updating their own profile
  IF caller_role != 'admin' AND caller_id != target_user_id THEN
    RAISE EXCEPTION 'Only admins can update other users';
  END IF;

  -- Update the user
  UPDATE users
  SET
    full_name = COALESCE(new_full_name, full_name),
    role = COALESCE(new_role, role),
    updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN updated_user;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_as_admin TO authenticated;
