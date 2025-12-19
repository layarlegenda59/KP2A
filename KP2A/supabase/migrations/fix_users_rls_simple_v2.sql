-- Simple fix for users table RLS infinite recursion - Version 2
-- This migration removes all policies and creates minimal ones

-- First, disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (comprehensive list)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create minimal policies without any recursion risk

-- Simple read policy - allow all authenticated users to read
CREATE POLICY "simple_users_read" ON users
FOR SELECT
TO authenticated
USING (true);

-- Simple insert policy - allow authenticated users to insert
CREATE POLICY "simple_users_insert" ON users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Simple update policy - users can only update their own record
CREATE POLICY "simple_users_update" ON users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Simple delete policy - allow authenticated users (for admin functions)
CREATE POLICY "simple_users_delete" ON users
FOR DELETE
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Add comment
COMMENT ON TABLE users IS 'Users table with minimal RLS policies - no recursion risk';