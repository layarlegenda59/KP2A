-- Fix duplicate data in dues table and apply proper RLS policies
-- This migration addresses duplicate data and ensures INSERT/UPDATE operations return data

-- Step 1: Remove duplicate entries, keeping the latest one
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY member_id, bulan, tahun 
               ORDER BY created_at DESC, id DESC
           ) as rn
    FROM dues
)
DELETE FROM dues 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all dues" ON dues;
DROP POLICY IF EXISTS "Users can insert dues" ON dues;
DROP POLICY IF EXISTS "Users can update dues" ON dues;
DROP POLICY IF EXISTS "Users can delete dues" ON dues;
DROP POLICY IF EXISTS "Authenticated users can view all dues" ON dues;
DROP POLICY IF EXISTS "Authenticated users can insert dues" ON dues;
DROP POLICY IF EXISTS "Authenticated users can update dues" ON dues;
DROP POLICY IF EXISTS "Authenticated users can delete dues" ON dues;

-- Step 3: Enable RLS on dues table
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive RLS policies that allow SELECT after INSERT/UPDATE
CREATE POLICY "Authenticated users can view all dues" ON dues
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert dues" ON dues
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update dues" ON dues
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dues" ON dues
    FOR DELETE
    TO authenticated
    USING (true);

-- Step 5: Add unique constraint after removing duplicates
DO $$
BEGIN
    -- Check if the unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dues_member_bulan_tahun_key' 
        AND table_name = 'dues'
    ) THEN
        -- Add unique constraint if it doesn't exist
        ALTER TABLE dues ADD CONSTRAINT dues_member_bulan_tahun_key 
        UNIQUE (member_id, bulan, tahun);
    END IF;
END $$;

-- Step 6: Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_dues_member_id ON dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_bulan_tahun ON dues(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_dues_composite_key ON dues(member_id, bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_dues_created_at ON dues(created_at);

-- Step 7: Grant necessary permissions to authenticated users
GRANT ALL ON dues TO authenticated;

-- Step 8: Grant sequence permissions if the sequence exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'dues_id_seq') THEN
        GRANT USAGE ON SEQUENCE dues_id_seq TO authenticated;
    END IF;
END $$;

-- Step 9: Add comment for documentation
COMMENT ON TABLE dues IS 'Table for storing member dues payments with proper RLS policies and no duplicates';

-- Step 10: Verify no duplicates remain
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT member_id, bulan, tahun, COUNT(*) as cnt
        FROM dues
        GROUP BY member_id, bulan, tahun
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Warning: % duplicate combinations still exist', duplicate_count;
    ELSE
        RAISE NOTICE 'Success: No duplicate combinations found';
    END IF;
END $$;