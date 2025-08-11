-- Add simpanan_wajib column to dues table
-- Run this script in your Supabase SQL Editor

-- Add simpanan_wajib column to dues table
ALTER TABLE public.dues 
ADD COLUMN IF NOT EXISTS simpanan_wajib DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN public.dues.simpanan_wajib IS 'Simpanan wajib anggota per bulan';

-- Update existing records to have default value
UPDATE public.dues 
SET simpanan_wajib = 0 
WHERE simpanan_wajib IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dues_simpanan_wajib ON public.dues(simpanan_wajib);

COMMIT;