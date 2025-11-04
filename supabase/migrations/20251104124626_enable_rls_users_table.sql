/*
  # Enable RLS on users table

  Enable Row Level Security on the users table so policies can work correctly.
*/

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
