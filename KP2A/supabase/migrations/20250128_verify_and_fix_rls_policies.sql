-- Verify and Fix RLS Policies for Transactions
-- Migration: 20250128_verify_and_fix_rls_policies.sql

-- First, let's check current policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT RLS POLICIES FOR TRANSACTIONS ===';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'transactions'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE 'Policy: % (%)' , policy_record.policyname, policy_record.cmd;
        RAISE NOTICE '  Roles: %', policy_record.roles;
        RAISE NOTICE '  Qualifier: %', policy_record.qual;
        RAISE NOTICE '  With Check: %', policy_record.with_check;
        RAISE NOTICE '  Permissive: %', policy_record.permissive;
        RAISE NOTICE '  ---';
    END LOOP;
END $$;

-- Check if RLS is enabled
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'transactions';
    
    RAISE NOTICE 'RLS enabled on transactions table: %', rls_enabled;
END $$;

-- Drop all existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

-- Enable RLS if not already enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- SELECT policy: Users can view their own transactions, admins/treasurers can view all
CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT USING (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

-- INSERT policy: Users can insert transactions with their own user ID
CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT WITH CHECK (
        auth.uid() = created_by
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

-- UPDATE policy: Users can update their own transactions, admins/treasurers can update all
CREATE POLICY "transactions_update_policy" ON transactions
    FOR UPDATE USING (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    ) WITH CHECK (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

-- DELETE policy: Users can delete their own transactions, admins/treasurers can delete all
CREATE POLICY "transactions_delete_policy" ON transactions
    FOR DELETE USING (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

-- Test the policies with a sample query
DO $$
DECLARE
    test_user_id UUID;
    test_transaction_id UUID;
    policy_test_result INTEGER;
BEGIN
    RAISE NOTICE '=== TESTING RLS POLICIES ===';
    
    -- Get a sample user and transaction
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    SELECT id INTO test_transaction_id FROM transactions LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_transaction_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user: % and transaction: %', test_user_id, test_transaction_id;
        
        -- Test if we can count transactions (this should work for any authenticated user)
        SELECT COUNT(*) INTO policy_test_result FROM transactions;
        RAISE NOTICE 'Total transactions visible: %', policy_test_result;
        
    ELSE
        RAISE NOTICE 'No test data available for policy testing';
    END IF;
END $$;

-- Show final policy state
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== FINAL RLS POLICIES FOR TRANSACTIONS ===';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'transactions'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE 'Policy: % (%)' , policy_record.policyname, policy_record.cmd;
        RAISE NOTICE '  Qualifier: %', policy_record.qual;
        RAISE NOTICE '  ---';
    END LOOP;
END $$;

SELECT 'RLS policies verification and fix completed!' as message;