-- Temporary disable RLS for transactions table to debug delete issues
-- This is a temporary measure to isolate the problem

-- Disable RLS on transactions table
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'transactions';