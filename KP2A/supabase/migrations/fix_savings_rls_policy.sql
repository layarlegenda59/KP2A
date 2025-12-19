-- Fix RLS policy for savings table to handle development sessions
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read savings" ON savings;
DROP POLICY IF EXISTS "Allow authenticated users to insert savings" ON savings;
DROP POLICY IF EXISTS "Allow authenticated users to update savings" ON savings;
DROP POLICY IF EXISTS "Allow authenticated users to delete savings" ON savings;

-- Create new policies that work with both authenticated and development sessions
-- Policy for reading savings data
CREATE POLICY "Allow users to read savings" ON savings
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    );

-- Policy for inserting savings data
CREATE POLICY "Allow users to insert savings" ON savings
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    );

-- Policy for updating savings data
CREATE POLICY "Allow users to update savings" ON savings
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    )
    WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    );

-- Policy for deleting savings data
CREATE POLICY "Allow users to delete savings" ON savings
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    );

-- Grant necessary permissions
GRANT ALL ON savings TO anon;
GRANT ALL ON savings TO authenticated;