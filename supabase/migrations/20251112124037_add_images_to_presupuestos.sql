/*
  # Add images field to presupuestos table

  1. Changes
    - Add image_urls column to store array of image URLs for anexo pages
    - Images will be displayed in separate ANEXO pages in PDF

  2. Notes
    - Using text array to store multiple image URLs
    - Each URL points to an image in Supabase storage
*/

-- Add image_urls column to presupuestos table
ALTER TABLE presupuestos 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];