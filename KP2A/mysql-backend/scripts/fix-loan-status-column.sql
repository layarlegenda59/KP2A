-- Fix loan_payments status column to support 'belum_lunas' status
-- This script updates the status ENUM to include all three values: 'lunas', 'belum_lunas', 'terlambat'

USE sidarsih;

-- Modify the status column to support the new 'belum_lunas' value
ALTER TABLE loan_payments MODIFY COLUMN status ENUM('lunas', 'belum_lunas', 'terlambat') NOT NULL DEFAULT 'belum_lunas';

-- Verify the change
DESCRIBE loan_payments;

SELECT 'Status column updated successfully' AS result;
