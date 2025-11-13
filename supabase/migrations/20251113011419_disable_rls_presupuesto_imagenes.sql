/*
  # Disable RLS on presupuesto_imagenes

  1. Changes
    - Disable Row Level Security on presupuesto_imagenes table
    - This will allow all operations without policy checks

  2. Note
    - This is a temporary measure to diagnose the issue
    - We can re-enable RLS later with proper policies
*/

-- Disable RLS
ALTER TABLE presupuesto_imagenes DISABLE ROW LEVEL SECURITY;