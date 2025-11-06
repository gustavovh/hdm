/*
  # Create Sales Targets System

  1. New Tables
    - `sales_targets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `mes` (integer, 1-12)
      - `año` (integer)
      - `objetivo` (decimal, target amount)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, admin who created it)

  2. Security
    - Enable RLS on `sales_targets` table
    - Admin can manage all targets
    - Vendedor can only view their own targets

  3. Indexes
    - Index on user_id for fast lookups
    - Unique index on (user_id, mes, año) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  año integer NOT NULL CHECK (año >= 2020),
  objetivo decimal(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create unique index to prevent duplicate targets for same user/month/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_user_month_year 
  ON sales_targets(user_id, mes, año);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id ON sales_targets(user_id);

-- Enable RLS
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

-- Admin can view all targets
CREATE POLICY "Admins can view all sales targets"
  ON sales_targets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can insert targets
CREATE POLICY "Admins can insert sales targets"
  ON sales_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can update targets
CREATE POLICY "Admins can update sales targets"
  ON sales_targets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can delete targets
CREATE POLICY "Admins can delete sales targets"
  ON sales_targets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Vendedor can view their own targets
CREATE POLICY "Vendedores can view own sales targets"
  ON sales_targets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sales_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_targets_updated_at();