-- Fix RLS policies for dues table to ensure INSERT/UPDATE operations return data
-- This migration addresses the issue where INSERT/UPDATE operations succeed but return null data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all dues" ON dues;
DROP POLICY IF EXISTS "Users can insert dues" ON dues;
DROP POLICY IF EXISTS "Users can update dues" ON dues;
DROP POLICY IF EXISTS "Users can delete dues" ON dues;

-- Enable RLS on dues table
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies that allow SELECT after INSERT/UPDATE
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

-- Ensure the dues table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_dues_member_id ON dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_bulan_tahun ON dues(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_dues_composite_key ON dues(member_id, bulan, tahun);

-- Grant necessary permissions to authenticated users
GRANT ALL ON dues TO authenticated;

-- Grant sequence permissions if the sequence exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'dues_id_seq') THEN
        GRANT USAGE ON SEQUENCE dues_id_seq TO authenticated;
    END IF;
END $$;

-- Verify the table structure and constraints
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

-- Add comment for documentation
COMMENT ON TABLE dues IS 'Table for storing member dues payments with proper RLS policies for INSERT/UPDATE operations';