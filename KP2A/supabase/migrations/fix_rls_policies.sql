-- Fix RLS policies for proper authentication and data access
-- This migration ensures that authenticated users can access data properly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;

DROP POLICY IF EXISTS "Users can view members" ON members;
DROP POLICY IF EXISTS "Admin can manage members" ON members;

DROP POLICY IF EXISTS "Users can view loans" ON loans;
DROP POLICY IF EXISTS "Admin can manage loans" ON loans;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

-- Members table policies
CREATE POLICY "Authenticated users can view members" ON members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage members" ON members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Loans table policies
CREATE POLICY "Authenticated users can view loans" ON loans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage loans" ON loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON users TO authenticated;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Add a policy for anonymous users to create accounts (needed for signup)
CREATE POLICY "Allow anonymous signup" ON users
  FOR INSERT WITH CHECK (auth.role() = 'anon');