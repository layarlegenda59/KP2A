-- Fix infinite recursion in users table RLS policies
-- This migration removes problematic policies and creates simple, non-recursive ones

-- Drop all existing policies on users table to start fresh
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

-- Create simple, non-recursive policies

-- Policy for SELECT: Users can view their own profile, admins can view all
CREATE POLICY "users_select_policy" ON users
FOR SELECT
USING (
  auth.uid()::text = id::text 
  OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy for INSERT: Only authenticated users can insert (typically during signup)
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
WITH CHECK (
  auth.uid()::text = id::text
  OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy for UPDATE: Users can update their own profile, admins can update all
CREATE POLICY "users_update_policy" ON users
FOR UPDATE
USING (
  auth.uid()::text = id::text
  OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  auth.uid()::text = id::text
  OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy for DELETE: Only admins can delete users
CREATE POLICY "users_delete_policy" ON users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT DELETE ON users TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE users IS 'Users table with fixed RLS policies to prevent infinite recursion';