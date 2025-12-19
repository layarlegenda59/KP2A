-- Fix loans table schema alignment
-- Add missing columns and create aliases for better code compatibility

-- First, drop the existing status constraint to allow updates
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;

-- Add missing due_date column
ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add missing amount column (alias for jumlah_pinjaman)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS amount NUMERIC;

-- Add missing interest_rate column (alias for bunga_persen)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_rate NUMERIC;

-- Add missing remaining_balance column (alias for sisa_pinjaman)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC;

-- Update status values to match code expectations BEFORE populating other columns
UPDATE loans SET status = 'active' WHERE status = 'aktif';
UPDATE loans SET status = 'completed' WHERE status = 'lunas';
UPDATE loans SET status = 'pending' WHERE status = 'pending';
UPDATE loans SET status = 'rejected' WHERE status = 'ditolak';

-- Update existing data to populate the new columns
UPDATE loans SET 
  amount = jumlah_pinjaman,
  interest_rate = bunga_persen,
  remaining_balance = sisa_pinjaman,
  due_date = tanggal_pinjaman + INTERVAL '1 month' * tenor_bulan
WHERE amount IS NULL OR interest_rate IS NULL OR remaining_balance IS NULL OR due_date IS NULL;

-- Add the updated check constraint to include both Indonesian and English status values
ALTER TABLE loans ADD CONSTRAINT loans_status_check 
  CHECK (status = ANY (ARRAY['aktif'::text, 'lunas'::text, 'pending'::text, 'ditolak'::text, 'active'::text, 'completed'::text, 'rejected'::text, 'overdue'::text]));

-- Create triggers to keep the columns in sync
CREATE OR REPLACE FUNCTION sync_loans_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync Indonesian to English columns
  IF NEW.jumlah_pinjaman IS NOT NULL THEN
    NEW.amount = NEW.jumlah_pinjaman;
  END IF;
  
  IF NEW.bunga_persen IS NOT NULL THEN
    NEW.interest_rate = NEW.bunga_persen;
  END IF;
  
  IF NEW.sisa_pinjaman IS NOT NULL THEN
    NEW.remaining_balance = NEW.sisa_pinjaman;
  END IF;
  
  -- Calculate due_date if not provided
  IF NEW.due_date IS NULL AND NEW.tanggal_pinjaman IS NOT NULL AND NEW.tenor_bulan IS NOT NULL THEN
    NEW.due_date = NEW.tanggal_pinjaman + INTERVAL '1 month' * NEW.tenor_bulan;
  END IF;
  
  -- Sync English to Indonesian columns (for backward compatibility)
  IF NEW.amount IS NOT NULL AND NEW.jumlah_pinjaman IS NULL THEN
    NEW.jumlah_pinjaman = NEW.amount;
  END IF;
  
  IF NEW.interest_rate IS NOT NULL AND NEW.bunga_persen IS NULL THEN
    NEW.bunga_persen = NEW.interest_rate;
  END IF;
  
  IF NEW.remaining_balance IS NOT NULL AND NEW.sisa_pinjaman IS NULL THEN
    NEW.sisa_pinjaman = NEW.remaining_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_loans_columns_trigger ON loans;
CREATE TRIGGER sync_loans_columns_trigger
  BEFORE INSERT OR UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION sync_loans_columns();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loans_amount ON loans(amount);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_remaining_balance ON loans(remaining_balance);