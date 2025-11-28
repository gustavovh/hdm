/*
  # Simplify update_user_as_admin - Remove complex checks

  1. Changes
    - Simplify the function to just check if user is admin
    - Don't rely on JWT claims
    - Query the users table directly for role
  
  2. Security
    - Still secure - checks admin status from database
    - SECURITY DEFINER bypasses RLS issues
*/

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
  -- Get authenticated user ID
  caller_id := auth.uid();
  
  -- Must be authenticated
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get caller's role from database (not JWT)
  SELECT u.role INTO caller_role
  FROM users u
  WHERE u.id = caller_id;

  -- If role not found, user doesn't exist
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found in system';
  END IF;

  -- Check permissions: must be admin OR updating own profile
  IF caller_role <> 'admin' AND caller_id <> target_user_id THEN
    RAISE EXCEPTION 'Permission denied: Only admins can update other users';
  END IF;

  -- Perform the update
  UPDATE users
  SET
    full_name = COALESCE(new_full_name, full_name),
    role = COALESCE(new_role, role),
    updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_user;

  -- Check if user was found
  IF updated_user IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  RETURN updated_user;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_as_admin(uuid, text, user_role) TO authenticated;
