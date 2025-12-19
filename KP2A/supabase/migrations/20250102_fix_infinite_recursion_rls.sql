-- Fix infinite recursion in RLS policies for users table
-- This migration removes recursive policies that cause infinite loops

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Allow anonymous signup" ON users;

DROP POLICY IF EXISTS "Authenticated users can view members" ON members;
DROP POLICY IF EXISTS "Admin can manage members" ON members;

DROP POLICY IF EXISTS "Authenticated users can view loans" ON loans;
DROP POLICY IF EXISTS "Admin can manage loans" ON loans;

-- Create non-recursive policies for users table
-- Use auth.jwt() to get user info without querying users table

-- Allow users to view their own profile using auth.uid()
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow admin users to view all users (using JWT claims instead of table lookup)
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Allow admin users to manage all users
CREATE POLICY "users_all_admin" ON users
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Allow user creation for authenticated and anonymous users
CREATE POLICY "users_insert_auth" ON users
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Members table policies (non-recursive)
CREATE POLICY "members_select_auth" ON members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "members_all_admin" ON members
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Loans table policies (non-recursive)
CREATE POLICY "loans_select_auth" ON loans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "loans_all_admin" ON loans
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON users TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;