-- Fix duplicate id_anggota values
-- This migration removes duplicate id_anggota entries, keeping only the first occurrence

-- First, identify and remove duplicate id_anggota values
-- Keep only the first member (by creation order) for each id_anggota
DELETE FROM members 
WHERE id NOT IN (
  SELECT DISTINCT ON (id_anggota) id
  FROM members 
  WHERE id_anggota IS NOT NULL 
  ORDER BY id_anggota, created_at ASC
);

-- Now add the unique constraint for id_anggota
ALTER TABLE members 
ADD CONSTRAINT unique_id_anggota UNIQUE (id_anggota);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_members_id_anggota ON members(id_anggota);