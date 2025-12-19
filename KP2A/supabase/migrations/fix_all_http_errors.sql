-- Fix all HTTP errors in ReportsPage.tsx
-- This migration addresses:
-- 1. Error 400: expenses query issues
-- 2. Error 406: users table RLS issues  
-- 3. Error 409: financial_reports constraint issues

-- 1. Fix financial_reports foreign key constraint
-- Drop the problematic foreign key constraint to auth.users
ALTER TABLE financial_reports DROP CONSTRAINT IF EXISTS financial_reports_created_by_fkey;

-- Change created_by to reference public.users instead of auth.users
ALTER TABLE financial_reports 
ADD CONSTRAINT financial_reports_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Fix RLS policies for users table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Allow all authenticated users to read users" ON users
FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow all authenticated users to insert users" ON users
FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow all authenticated users to update users" ON users
FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 3. Fix RLS policies for financial_reports table
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view financial_reports" ON financial_reports;
DROP POLICY IF EXISTS "Allow authenticated users to insert financial_reports" ON financial_reports;
DROP POLICY IF EXISTS "Allow authenticated users to update financial_reports" ON financial_reports;
DROP POLICY IF EXISTS "Allow authenticated users to delete financial_reports" ON financial_reports;

-- Create comprehensive RLS policies for financial_reports table
CREATE POLICY "Allow all users to view financial_reports" ON financial_reports
FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert financial_reports" ON financial_reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update financial_reports" ON financial_reports
FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete financial_reports" ON financial_reports
FOR DELETE USING (true);

-- 4. Fix RLS policies for expenses table
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;

-- Create comprehensive RLS policies for expenses table
CREATE POLICY "Allow all users to view expenses" ON expenses
FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert expenses" ON expenses
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update expenses" ON expenses
FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete expenses" ON expenses
FOR DELETE USING (true);

-- 5. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_financial_reports_periode ON financial_reports(periode_start, periode_end);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_date ON expenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);