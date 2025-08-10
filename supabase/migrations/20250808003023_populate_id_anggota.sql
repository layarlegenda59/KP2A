-- Populate id_anggota for existing members
-- This migration assigns id_anggota values to existing members who don't have them

-- First, clear any existing duplicate or empty id_anggota values
UPDATE members SET id_anggota = NULL WHERE id_anggota = '';

-- Update specific roles only if they don't already have id_anggota
UPDATE members 
SET id_anggota = '001-KP2ACIMAHI'
WHERE jabatan = 'Ketua' AND id_anggota IS NULL
  AND NOT EXISTS (SELECT 1 FROM members WHERE id_anggota = '001-KP2ACIMAHI');

UPDATE members 
SET id_anggota = '002-KP2ACIMAHI'
WHERE jabatan = 'Bendahara' AND id_anggota IS NULL
  AND NOT EXISTS (SELECT 1 FROM members WHERE id_anggota = '002-KP2ACIMAHI');

UPDATE members 
SET id_anggota = '003-KP2ACIMAHI'
WHERE jabatan = 'Sekretaris' AND id_anggota IS NULL
  AND NOT EXISTS (SELECT 1 FROM members WHERE id_anggota = '003-KP2ACIMAHI');

-- Then update remaining members with sequential numbers
WITH numbered_members AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) + 3 as row_num
  FROM members 
  WHERE id_anggota IS NULL
)
UPDATE members 
SET id_anggota = LPAD(numbered_members.row_num::text, 3, '0') || '-KP2ACIMAHI'
FROM numbered_members
WHERE members.id = numbered_members.id;

-- Create index for id_anggota for better performance
CREATE INDEX IF NOT EXISTS idx_members_id_anggota ON members(id_anggota);

-- Note: Unique constraint will be added later after ensuring all data is clean