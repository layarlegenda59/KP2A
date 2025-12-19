-- Fix authentication and API key issues
-- Ensure proper RLS policies without infinite recursion

-- First, ensure all existing problematic policies are dropped
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Allow anonymous signup" ON users;

-- Drop any duplicate policies that might exist
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_all_admin" ON users;
DROP POLICY IF EXISTS "users_insert_auth" ON users;

-- Create simple, non-recursive policies for users table
-- Allow users to view their own profile using auth.uid()
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to do everything (for admin operations)
CREATE POLICY "users_service_role_all" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert new users (for registration)
CREATE POLICY "users_insert_auth" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow anon users to insert (for signup)
CREATE POLICY "users_insert_anon" ON users
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated, anon;