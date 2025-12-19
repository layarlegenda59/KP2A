-- Enhanced Expenses Module Migration - Step 3: Migrate Existing Data
-- Migration: 003_migrate_existing_data.sql

-- Migrate existing expenses data to new transactions table
DO $$
DECLARE
    default_category_id UUID;
    default_payment_method_id UUID;
    migrated_count INTEGER := 0;
BEGIN
    -- Get default category ID (Operasional)
    SELECT id INTO default_category_id 
    FROM transaction_categories 
    WHERE name = 'Operasional' AND type = 'expense';
    
    -- Get default payment method ID (Tunai)
    SELECT id INTO default_payment_method_id 
    FROM payment_methods 
    WHERE name = 'Tunai';
    
    -- Check if we have the required default values
    IF default_category_id IS NULL THEN
        RAISE EXCEPTION 'Default category "Operasional" not found';
    END IF;
    
    IF default_payment_method_id IS NULL THEN
        RAISE EXCEPTION 'Default payment method "Tunai" not found';
    END IF;
    
    -- Migrate data from expenses to transactions (if expenses table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        INSERT INTO transactions (
            transaction_type,
            amount,
            transaction_date,
            category_id,
            description,
            payment_method_id,
            status,
            created_by,
            created_at,
            updated_at
        )
        SELECT 
            'expense' as transaction_type,
            CASE 
                WHEN amount IS NOT NULL AND amount > 0 THEN amount
                ELSE 0.01 -- Minimum amount for validation
            END as amount,
            COALESCE(payment_date, CURRENT_DATE) as transaction_date,
            default_category_id as category_id,
            COALESCE(notes, 'Migrated from old expenses system') as description,
            default_payment_method_id as payment_method_id,
            CASE 
                WHEN status = 'paid' THEN 'approved'
                WHEN status = 'overdue' THEN 'pending'
                ELSE 'pending'
            END as status,
            created_by as created_by,
            COALESCE(created_at, NOW()) as created_at,
            COALESCE(updated_at, NOW()) as updated_at
        FROM expenses
        WHERE amount IS NOT NULL AND amount > 0;
        
        -- Get count of migrated records
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        
        RAISE NOTICE 'Successfully migrated % records from expenses to transactions', migrated_count;
    ELSE
        RAISE NOTICE 'No expenses table found - skipping data migration';
    END IF;
    
    -- Log completion
    RAISE NOTICE 'Migration completed successfully';
    
END $$;