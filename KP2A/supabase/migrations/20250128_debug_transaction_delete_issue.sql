-- Debug Transaction Delete Issue Migration
-- Migration: 20250128_debug_transaction_delete_issue.sql
-- This migration helps debug and fix transaction delete issues

-- Check current state of transactions table
DO $$
DECLARE
    total_transactions INTEGER;
    null_created_by_count INTEGER;
    valid_created_by_count INTEGER;
    sample_transaction RECORD;
BEGIN
    -- Count total transactions
    SELECT COUNT(*) INTO total_transactions FROM transactions;
    
    -- Count transactions with NULL created_by
    SELECT COUNT(*) INTO null_created_by_count FROM transactions WHERE created_by IS NULL;
    
    -- Count transactions with valid created_by
    SELECT COUNT(*) INTO valid_created_by_count FROM transactions WHERE created_by IS NOT NULL;
    
    RAISE NOTICE '=== TRANSACTION DEBUG REPORT ===';
    RAISE NOTICE 'Total transactions: %', total_transactions;
    RAISE NOTICE 'Transactions with NULL created_by: %', null_created_by_count;
    RAISE NOTICE 'Transactions with valid created_by: %', valid_created_by_count;
    
    -- Show sample transaction data
    SELECT * INTO sample_transaction FROM transactions LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample transaction:';
        RAISE NOTICE '  ID: %', sample_transaction.id;
        RAISE NOTICE '  Created by: %', sample_transaction.created_by;
        RAISE NOTICE '  Description: %', sample_transaction.description;
        RAISE NOTICE '  Amount: %', sample_transaction.amount;
    END IF;
END $$;

-- Check auth.users table
DO $$
DECLARE
    total_users INTEGER;
    admin_users INTEGER;
    sample_user RECORD;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM auth.users;
    
    -- Count admin users
    SELECT COUNT(*) INTO admin_users 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin';
    
    RAISE NOTICE '=== USERS DEBUG REPORT ===';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Admin users: %', admin_users;
    
    -- Show sample user data
    SELECT * INTO sample_user FROM auth.users LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE 'Sample user:';
        RAISE NOTICE '  ID: %', sample_user.id;
        RAISE NOTICE '  Email: %', sample_user.email;
        RAISE NOTICE '  Role: %', sample_user.raw_user_meta_data->>'role';
    END IF;
END $$;

-- Check RLS policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== RLS POLICIES DEBUG ===';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'transactions'
    LOOP
        RAISE NOTICE 'Policy: % on %.%', policy_record.policyname, policy_record.schemaname, policy_record.tablename;
        RAISE NOTICE '  Command: %', policy_record.cmd;
        RAISE NOTICE '  Roles: %', policy_record.roles;
        RAISE NOTICE '  Qualifier: %', policy_record.qual;
        RAISE NOTICE '  With Check: %', policy_record.with_check;
        RAISE NOTICE '  ---';
    END LOOP;
END $$;

-- Fix any remaining NULL created_by values
DO $$
DECLARE
    admin_user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Find an admin user or any user
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin' 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
    END IF;
    
    IF admin_user_id IS NOT NULL THEN
        UPDATE transactions 
        SET created_by = admin_user_id,
            updated_at = NOW()
        WHERE created_by IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        IF updated_count > 0 THEN
            RAISE NOTICE 'FIXED: Updated % transactions with created_by = %', updated_count, admin_user_id;
        ELSE
            RAISE NOTICE 'INFO: No transactions needed created_by fix';
        END IF;
    ELSE
        RAISE WARNING 'No users found to assign as created_by for NULL transactions';
    END IF;
END $$;

-- Test delete permission for a sample transaction
DO $$
DECLARE
    test_transaction_id UUID;
    test_user_id UUID;
    can_delete BOOLEAN := FALSE;
BEGIN
    -- Get a sample transaction
    SELECT id, created_by INTO test_transaction_id, test_user_id 
    FROM transactions 
    WHERE created_by IS NOT NULL 
    LIMIT 1;
    
    IF test_transaction_id IS NOT NULL THEN
        RAISE NOTICE '=== DELETE PERMISSION TEST ===';
        RAISE NOTICE 'Testing transaction: %', test_transaction_id;
        RAISE NOTICE 'Transaction owner: %', test_user_id;
        
        -- This is just a test query, not actual delete
        BEGIN
            PERFORM 1 FROM transactions 
            WHERE id = test_transaction_id 
            AND (created_by = test_user_id OR EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = test_user_id 
                AND raw_user_meta_data->>'role' IN ('admin', 'treasurer')
            ));
            
            can_delete := FOUND;
            RAISE NOTICE 'Delete permission check: %', CASE WHEN can_delete THEN 'ALLOWED' ELSE 'DENIED' END;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Delete permission test failed: %', SQLERRM;
        END;
    END IF;
END $$;

SELECT 'Transaction delete debug completed!' as message;