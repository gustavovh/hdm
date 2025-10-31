/*
  # Fix User Synchronization

  1. Changes
    - Remove fixed UUID users from seed data
    - Create function to sync auth.users with public.users
    - Create trigger to automatically create user profile on signup
  
  2. Security
    - Maintains existing RLS policies
    - Automatic profile creation for new users
*/

-- Remove old seed users with fixed UUIDs
DELETE FROM users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'vendedor'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to manually set user as admin (only admins can run this)
CREATE OR REPLACE FUNCTION public.set_user_role(user_id uuid, new_role user_role)
RETURNS void AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  UPDATE users 
  SET role = new_role 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;