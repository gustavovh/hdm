/*
  # Create clientes table for storing client information

  1. New Tables
    - `clientes`
      - `id` (uuid, primary key)
      - `nombre` (text) - Client name
      - `documento` (text) - Client document/ID
      - `direccion` (text) - Address
      - `telefono` (text) - Phone
      - `email` (text) - Email
      - `ciudad` (text) - City
      - `pais` (text) - Country
      - `vendedor_id` (uuid, foreign key) - Salesperson who created the client
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `clientes` table
    - Add policy for authenticated users to read all clients
    - Add policy for users to insert their own clients
    - Add policy for users to update their own clients
    - Add policy for admins to manage all clients

  3. Indexes
    - Add index on nombre for fast searching
    - Add index on documento for fast searching
    - Add index on vendedor_id
*/

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  documento text,
  direccion text,
  telefono text,
  email text,
  ciudad text,
  pais text DEFAULT 'Paraguay',
  vendedor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all clients"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own clients"
  ON clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "Users can update their own clients"
  ON clientes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "Admins can manage all clients"
  ON clientes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'administrativo')
    )
  );

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);

CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_updated_at();