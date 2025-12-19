-- Fix Existing Transactions Created By Migration
-- Migration: 20250128_fix_existing_transactions_created_by.sql
-- This migration fixes existing transactions that don't have created_by field set

-- First, let's check how many transactions don't have created_by
DO $$
DECLARE
    null_created_by_count INTEGER;
    total_transactions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_created_by_count FROM transactions WHERE created_by IS NULL;
    SELECT COUNT(*) INTO total_transactions_count FROM transactions;
    
    RAISE NOTICE 'Found % transactions without created_by out of % total transactions', 
        null_created_by_count, total_transactions_count;
END $$;

-- For existing transactions without created_by, we'll set them to the first admin user
-- This is a fallback solution since we can't determine the original creator
DO $$
DECLARE
    admin_user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Try to find an admin user
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin' 
    LIMIT 1;
    
    -- If no admin found, try to find any user
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM auth.users 
        LIMIT 1;
    END IF;
    
    -- If we found a user, update the transactions
    IF admin_user_id IS NOT NULL THEN
        UPDATE transactions 
        SET created_by = admin_user_id,
            updated_at = NOW()
        WHERE created_by IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        RAISE NOTICE 'Updated % transactions with created_by = %', updated_count, admin_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table. Transactions will remain with NULL created_by.';
    END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
    remaining_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_null_count FROM transactions WHERE created_by IS NULL;
    
    IF remaining_null_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All transactions now have created_by field set';
    ELSE
        RAISE NOTICE 'WARNING: % transactions still have NULL created_by', remaining_null_count;
    END IF;
END $$;

-- Log completion
SELECT 'Existing transactions created_by fix completed!' as message;