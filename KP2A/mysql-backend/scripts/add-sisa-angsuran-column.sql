-- Add sisa_angsuran column to loan_payments table
USE sidarsih;

ALTER TABLE loan_payments 
ADD COLUMN sisa_angsuran DECIMAL(15,2) DEFAULT 0 AFTER total_angsuran;

-- Update existing records to calculate sisa_angsuran
-- For existing payments, we'll set sisa_angsuran to the current loan's sisa_pinjaman
UPDATE loan_payments lp 
JOIN loans l ON lp.loan_id = l.id 
SET lp.sisa_angsuran = l.sisa_pinjaman;

SELECT 'sisa_angsuran column added to loan_payments table successfully!' AS status;
