/*
  # Add signature field to users

  1. Changes
    - Add `signature_url` column to `users` table to store signature image URL
    - Column allows NULL values as signatures are optional
  
  2. Notes
    - Signatures will be stored in Supabase Storage
    - Each user can upload their own signature image (JPG/PNG)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE users ADD COLUMN signature_url text;
  END IF;
END $$;
