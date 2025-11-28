/*
  # Add debug function to check auth context

  1. New Functions
    - `debug_auth_context` - Returns current auth.uid() and user role
  
  2. Purpose
    - Help diagnose authentication issues
*/

CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid;
  current_role user_role;
  result jsonb;
BEGIN
  current_uid := auth.uid();
  
  IF current_uid IS NULL THEN
    RETURN jsonb_build_object(
      'auth_uid', NULL,
      'user_role', NULL,
      'message', 'Not authenticated'
    );
  END IF;

  SELECT role INTO current_role
  FROM users
  WHERE id = current_uid;

  RETURN jsonb_build_object(
    'auth_uid', current_uid,
    'user_role', current_role,
    'message', 'Authenticated'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION debug_auth_context TO authenticated;
