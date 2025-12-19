-- Add Missing Transaction Categories Migration
-- Migration: 20250127_add_missing_transaction_categories.sql
-- This migration adds missing transaction categories and fixes existing category typos

-- Add 'Lain-Lain Pemasukan' income category (only if it doesn't exist)
INSERT INTO transaction_categories (name, type, color_code, description) 
SELECT 'Lain-Lain Pemasukan', 'income', '#22c55e', 'Pemasukan lain-lain yang tidak termasuk kategori khusus'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Lain-Lain Pemasukan');

-- Add 'Lain-Lain Pengeluaran' expense category (only if it doesn't exist)
INSERT INTO transaction_categories (name, type, color_code, description) 
SELECT 'Lain-Lain Pengeluaran', 'expense', '#ef4444', 'Pengeluaran lain-lain yang tidak termasuk kategori khusus'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Lain-Lain Pengeluaran');

-- Add 'Cicilan Anggota' income category (only if it doesn't exist)
INSERT INTO transaction_categories (name, type, color_code, description) 
SELECT 'Cicilan Anggota', 'income', '#ef4444', 'Pembayaran Cicilan Pinjaman Anggota KP2A'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Cicilan Anggota');

-- Fix typo: Update 'CIcilan Anggota' to 'Cicilan Anggota' if it exists
UPDATE transaction_categories 
SET name = 'Cicilan Anggota'
WHERE name = 'CIcilan Anggota';

-- Ensure all categories are active
UPDATE transaction_categories 
SET is_active = true 
WHERE name IN ('Lain-Lain Pemasukan', 'Lain-Lain Pengeluaran', 'Cicilan Anggota');

-- Log the changes
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM transaction_categories WHERE is_active = true;
    RAISE NOTICE 'Migration completed. Total active categories: %', category_count;
    
    -- Log specific categories added/updated
    IF EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Lain-Lain Pemasukan') THEN
        RAISE NOTICE 'Added/Updated: Lain-Lain Pemasukan (income)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Lain-Lain Pengeluaran') THEN
        RAISE NOTICE 'Added/Updated: Lain-Lain Pengeluaran (expense)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Cicilan Anggota') THEN
        RAISE NOTICE 'Added/Updated: Cicilan Anggota (income)';
    END IF;
END $$;