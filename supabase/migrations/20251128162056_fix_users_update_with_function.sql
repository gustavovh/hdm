/*
  # Fix Users Update - Use SECURITY DEFINER Function

  1. Changes
    - Create a SECURITY DEFINER function to update users
    - This bypasses RLS recursion issues
    - Only admins can use this function to update other users
  
  2. Security
    - Function checks if caller is admin
    - Function validates user exists before updating
*/

-- Create function to update user (admins only)
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
BEGIN
  -- Get the caller's role
  SELECT role INTO caller_role
  FROM users
  WHERE id = auth.uid();

  -- Check if caller is admin or updating their own profile
  IF caller_role != 'admin' AND auth.uid() != target_user_id THEN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_as_admin TO authenticated;
