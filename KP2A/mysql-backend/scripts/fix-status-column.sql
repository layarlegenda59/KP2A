-- Fix status column to support longer values like 'belum_lunas'
ALTER TABLE loan_payments MODIFY COLUMN status ENUM('lunas', 'terlambat', 'belum_lunas') NOT NULL DEFAULT 'lunas';
