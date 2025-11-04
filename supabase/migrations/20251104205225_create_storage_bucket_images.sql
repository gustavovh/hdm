/*
  # Crear Bucket de Storage para Imágenes

  1. Storage
    - Crea bucket `presupuesto-images`
    - Público para lectura
    - Privado para escritura
  
  2. Políticas de Storage
    - Usuarios autenticados pueden subir
    - Solo pueden subir a sus propios presupuestos
    - Todos pueden leer (público)
*/

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presupuesto-images',
  'presupuesto-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Política: Cualquiera puede ver las imágenes (bucket público)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'presupuesto-images');

-- Política: Usuarios autenticados pueden subir imágenes
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'presupuesto-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Usuarios pueden actualizar sus propias imágenes
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'presupuesto-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Usuarios pueden eliminar sus propias imágenes
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'presupuesto-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);