/*
  # Create Storage Bucket for Images and Signatures

  1. Storage Setup
    - Create `images` bucket for storing product images and user signatures
    - Set bucket to public access for easy retrieval
    - Enable file size limits (10MB max)
  
  2. Security Policies
    - Allow authenticated users to upload files
    - Allow authenticated users to update their own files
    - Allow authenticated users to delete their own files
    - Allow public read access to all files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Policy: Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow public read access to all images
DROP POLICY IF EXISTS "Public read access to images" ON storage.objects;
CREATE POLICY "Public read access to images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');
