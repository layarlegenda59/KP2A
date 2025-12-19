-- Check Transaction Data Integrity
-- Migration: 20250128_check_transaction_data_integrity.sql

-- Check all transactions and their created_by status
DO $$
DECLARE
    total_transactions INTEGER;
    null_created_by_count INTEGER;
    invalid_created_by_count INTEGER;
    valid_created_by_count INTEGER;
    transaction_record RECORD;
    user_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== TRANSACTION DATA INTEGRITY CHECK ===';
    
    -- Count total transactions
    SELECT COUNT(*) INTO total_transactions FROM transactions;
    RAISE NOTICE 'Total transactions: %', total_transactions;
    
    -- Count transactions with NULL created_by
    SELECT COUNT(*) INTO null_created_by_count 
    FROM transactions 
    WHERE created_by IS NULL;
    RAISE NOTICE 'Transactions with NULL created_by: %', null_created_by_count;
    
    -- Count transactions with invalid created_by (user doesn't exist)
    SELECT COUNT(*) INTO invalid_created_by_count
    FROM transactions t
    WHERE t.created_by IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = t.created_by
    );
    RAISE NOTICE 'Transactions with invalid created_by (user not found): %', invalid_created_by_count;
    
    -- Count transactions with valid created_by
    SELECT COUNT(*) INTO valid_created_by_count
    FROM transactions t
    WHERE t.created_by IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = t.created_by
    );
    RAISE NOTICE 'Transactions with valid created_by: %', valid_created_by_count;
    
    -- Show sample transactions with their created_by status
    RAISE NOTICE '=== SAMPLE TRANSACTION DATA ===';
    FOR transaction_record IN 
        SELECT t.id, t.description, t.amount, t.created_by, t.created_at,
               CASE WHEN u.id IS NOT NULL THEN 'VALID' ELSE 'INVALID' END as user_status,
               u.email as user_email
        FROM transactions t
        LEFT JOIN auth.users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Transaction: % (%) - Amount: % - Created by: % (%) - User: %', 
            transaction_record.id, 
            transaction_record.description,
            transaction_record.amount,
            transaction_record.created_by,
            transaction_record.user_status,
            COALESCE(transaction_record.user_email, 'N/A');
    END LOOP;
    
    -- Fix any NULL created_by values
    IF null_created_by_count > 0 THEN
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
                RAISE NOTICE 'FIXED: Updated % transactions with NULL created_by to user: %', 
                    updated_count, admin_user_id;
            ELSE
                RAISE WARNING 'Cannot fix NULL created_by: No users found in auth.users table';
            END IF;
        END;
    END IF;
    
    -- Fix any invalid created_by values (pointing to non-existent users)
    IF invalid_created_by_count > 0 THEN
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
                WHERE created_by IS NOT NULL 
                AND NOT EXISTS (
                    SELECT 1 FROM auth.users u WHERE u.id = transactions.created_by
                );
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
                RAISE NOTICE 'FIXED: Updated % transactions with invalid created_by to user: %', 
                    updated_count, admin_user_id;
            ELSE
                RAISE WARNING 'Cannot fix invalid created_by: No users found in auth.users table';
            END IF;
        END;
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    final_null_count INTEGER;
    final_invalid_count INTEGER;
    final_valid_count INTEGER;
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    
    SELECT COUNT(*) INTO final_null_count 
    FROM transactions 
    WHERE created_by IS NULL;
    
    SELECT COUNT(*) INTO final_invalid_count
    FROM transactions t
    WHERE t.created_by IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = t.created_by
    );
    
    SELECT COUNT(*) INTO final_valid_count
    FROM transactions t
    WHERE t.created_by IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = t.created_by
    );
    
    RAISE NOTICE 'After fixes:';
    RAISE NOTICE '- NULL created_by: %', final_null_count;
    RAISE NOTICE '- Invalid created_by: %', final_invalid_count;
    RAISE NOTICE '- Valid created_by: %', final_valid_count;
    
    IF final_null_count = 0 AND final_invalid_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All transactions now have valid created_by values!';
    ELSE
        RAISE WARNING 'ISSUE: Some transactions still have invalid created_by values';
    END IF;
END $$;

SELECT 'Transaction data integrity check completed!' as message;