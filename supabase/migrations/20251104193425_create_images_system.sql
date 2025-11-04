/*
  # Sistema de Imágenes para Presupuestos

  1. Nuevas Tablas
    - `presupuesto_imagenes`
      - `id` (uuid, primary key)
      - `presupuesto_id` (uuid, foreign key)
      - `url` (text) - URL de Supabase Storage
      - `nombre_archivo` (text) - Nombre original del archivo
      - `tipo_mime` (text) - Tipo MIME del archivo
      - `tamanio` (integer) - Tamaño en bytes
      - `orden` (integer) - Orden de visualización
      - `descripcion` (text, nullable)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key)

  2. Storage
    - Bucket `presupuesto-images` (público para lectura)
    - Políticas de acceso por usuario

  3. Security
    - Enable RLS on `presupuesto_imagenes`
    - Admins can see all images
    - Vendedores can only see images from their presupuestos
*/

-- Crear tabla de imágenes
CREATE TABLE IF NOT EXISTS presupuesto_imagenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  url text NOT NULL,
  nombre_archivo text NOT NULL,
  tipo_mime text NOT NULL,
  tamanio integer NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_presupuesto_imagenes_presupuesto ON presupuesto_imagenes(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_imagenes_orden ON presupuesto_imagenes(presupuesto_id, orden);

-- Enable RLS
ALTER TABLE presupuesto_imagenes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view all images"
  ON presupuesto_imagenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Vendedores can view images from their presupuestos"
  ON presupuesto_imagenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_imagenes.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert images to their presupuestos"
  ON presupuesto_imagenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos
      WHERE presupuestos.id = presupuesto_imagenes.presupuesto_id
      AND presupuestos.vendedor_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete their own images"
  ON presupuesto_imagenes FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Storage bucket será creado mediante la consola de Supabase o CLI
-- Las políticas de storage se configuran en la UI de Supabase

COMMENT ON TABLE presupuesto_imagenes IS 'Imágenes adjuntas a los presupuestos';
