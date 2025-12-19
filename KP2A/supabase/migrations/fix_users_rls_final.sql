-- Final fix for users table RLS infinite recursion
-- This migration creates the simplest possible policies to avoid recursion

-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON users;

-- Create the simplest possible policies without recursion

-- Allow authenticated users to read all users (simplest approach)
CREATE POLICY "users_read_all" ON users
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert (for registration)
CREATE POLICY "users_insert_auth" ON users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own records only
CREATE POLICY "users_update_own" ON users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Allow authenticated users to delete (admin functionality)
CREATE POLICY "users_delete_auth" ON users
FOR DELETE
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;

-- Add comment
COMMENT ON TABLE users IS 'Users table with simple RLS policies - no recursion';