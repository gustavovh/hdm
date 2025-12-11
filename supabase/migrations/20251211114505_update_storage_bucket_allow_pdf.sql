/*
  # Update Storage Bucket to Allow PDF Files

  1. Changes
    - Update `presupuesto-images` bucket to allow PDF files
    - Increase file size limit to 10MB to accommodate invoice PDFs
    - Add `application/pdf` to allowed MIME types

  2. Security
    - Maintains existing RLS policies
    - PDFs can be uploaded by authenticated users
    - Public read access maintained for all files
*/

-- Update bucket to allow PDF files and increase size limit
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  file_size_limit = 10485760 -- 10MB (increased from 5MB to accommodate PDFs)
WHERE id = 'presupuesto-images';
