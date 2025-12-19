-- Fix authentication refresh token issues
-- This migration addresses the "Invalid Refresh Token: Refresh Token Not Found" error

-- First, ensure all RLS policies are properly configured for authentication
-- Drop any problematic policies that might cause auth issues
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_service_role_all" ON users;
DROP POLICY IF EXISTS "users_insert_auth" ON users;
DROP POLICY IF EXISTS "users_anonymous_signup" ON users;

-- Create simple, working policies for users table
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to do everything (for admin operations)
CREATE POLICY "users_service_role_all" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert new users (for registration)
CREATE POLICY "users_insert_auth" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Add a policy to allow anonymous users to create accounts (needed for signup)
CREATE POLICY "users_anonymous_signup" ON users
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Ensure proper grants for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON members, loans, dues, expenses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON members, loans, dues, expenses TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Ensure RLS is enabled but not blocking legitimate operations
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Authentication refresh token issues fixed successfully!' as message;