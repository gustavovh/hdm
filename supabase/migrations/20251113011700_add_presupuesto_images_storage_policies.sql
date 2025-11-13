/*
  # Add storage policies for presupuesto-images bucket

  1. Changes
    - Add INSERT policy to allow authenticated users to upload images
    - Add UPDATE policy to allow users to update their own images
    - Add DELETE policy to allow users to delete their own images

  2. Security
    - Authenticated users can upload to presupuesto-images bucket
    - Users can only modify/delete images in their own folder
*/

-- Allow authenticated users to upload images to presupuesto-images bucket
CREATE POLICY "Authenticated users can upload to presupuesto-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'presupuesto-images');

-- Allow users to update their own images
CREATE POLICY "Users can update own images in presupuesto-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'presupuesto-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'presupuesto-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images in presupuesto-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'presupuesto-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);