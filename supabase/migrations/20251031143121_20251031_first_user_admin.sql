/*
  # First User is Admin
  
  1. Changes
    - Update handle_new_user to make first user admin automatically
    - Subsequent users are vendedor by default
*/

-- Update function to make first user admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Insert new user
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- First user is admin, rest are vendedor
    CASE 
      WHEN user_count = 0 THEN 'admin'::user_role
      ELSE COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'vendedor'::user_role)
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;