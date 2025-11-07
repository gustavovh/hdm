/*
  # Create Seguimiento (Tracking) System

  1. New Tables
    - `presupuesto_seguimiento`
      - `id` (uuid, primary key)
      - `presupuesto_id` (uuid, foreign key to presupuestos)
      - `user_id` (uuid, foreign key to users)
      - `fecha` (timestamp, date of action)
      - `accion` (text, action taken)
      - `status_comentario` (text, status comment)
      - `proxima_accion` (text, next action)
      - `fecha_proxima_accion` (date, date of next action)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `presupuesto_seguimiento` table
    - Users can view seguimientos for presupuestos they have access to
    - Users can create seguimientos for presupuestos they have access to
    - Users can update their own seguimientos
    - Admins and administrativos can manage all seguimientos
*/

-- Create presupuesto_seguimiento table
CREATE TABLE IF NOT EXISTS presupuesto_seguimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  accion text NOT NULL,
  status_comentario text,
  proxima_accion text,
  fecha_proxima_accion date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE presupuesto_seguimiento ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view seguimientos for presupuestos they have access to
CREATE POLICY "Users can view seguimientos for accessible presupuestos"
ON presupuesto_seguimiento
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = presupuesto_seguimiento.presupuesto_id
    AND (
      p.vendedor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'administrativo')
      )
    )
  )
);

-- Policy: Users can create seguimientos for presupuestos they have access to
CREATE POLICY "Users can create seguimientos for accessible presupuestos"
ON presupuesto_seguimiento
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM presupuestos p
    WHERE p.id = presupuesto_seguimiento.presupuesto_id
    AND (
      p.vendedor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'administrativo')
      )
    )
  )
);

-- Policy: Users can update their own seguimientos
CREATE POLICY "Users can update own seguimientos"
ON presupuesto_seguimiento
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
);

-- Policy: Users can delete their own seguimientos
CREATE POLICY "Users can delete own seguimientos"
ON presupuesto_seguimiento
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'administrativo')
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_seguimiento_presupuesto 
ON presupuesto_seguimiento(presupuesto_id);

CREATE INDEX IF NOT EXISTS idx_seguimiento_fecha_proxima 
ON presupuesto_seguimiento(fecha_proxima_accion) 
WHERE fecha_proxima_accion IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seguimiento_user 
ON presupuesto_seguimiento(user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_seguimiento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_seguimiento_updated_at_trigger ON presupuesto_seguimiento;
CREATE TRIGGER update_seguimiento_updated_at_trigger
  BEFORE UPDATE ON presupuesto_seguimiento
  FOR EACH ROW
  EXECUTE FUNCTION update_seguimiento_updated_at();
