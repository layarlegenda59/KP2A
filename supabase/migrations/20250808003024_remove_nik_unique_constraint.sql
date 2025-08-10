-- Remove unique constraint from NIK field since we now use id_anggota as primary identifier
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_nik_key;

-- Make NIK field nullable since it's no longer the primary identifier
ALTER TABLE members ALTER COLUMN nik DROP NOT NULL;