-- Fix dues data discrepancy to match Excel totals
-- Target: Iuran Wajib 19,800,000, Simpanan Wajib 37,200,000

-- 1. Add missing January record for Tirta Wening
INSERT INTO dues (
  member_id, 
  bulan, 
  tahun, 
  iuran_wajib, 
  iuran_sukarela, 
  simpanan_wajib, 
  tanggal_bayar, 
  status
)
SELECT 
  '2a8f61a9-912b-4299-b972-1cb71f873e9f'::uuid, -- Tirta Wening ID
  1, -- January
  2023,
  50000,
  0,
  100000,
  '2023-01-31'::date,
  'lunas'
WHERE NOT EXISTS (
  SELECT 1 FROM dues 
  WHERE member_id = '2a8f61a9-912b-4299-b972-1cb71f873e9f'::uuid 
  AND bulan = 1 
  AND tahun = 2023
);

-- 2. Update Tirta Walatra records (currently all zeros)
UPDATE dues 
SET 
  iuran_wajib = 50000,
  simpanan_wajib = 100000,
  updated_at = now()
WHERE member_id = 'd74aa1b0-a4e9-410d-be60-66a8329efa0b'::uuid -- Tirta Walatra ID
  AND tahun = 2023
  AND iuran_wajib = 0;

-- 3. Update Damar Tirta simpanan_wajib (currently 0)
UPDATE dues 
SET 
  simpanan_wajib = 100000,
  updated_at = now()
WHERE member_id = 'eaeada1d-4b89-4e26-a8b2-f679d0b50598'::uuid -- Damar Tirta ID
  AND tahun = 2023
  AND simpanan_wajib = 0;

-- Verify the changes
DO $$
DECLARE
  total_iw NUMERIC;
  total_sw NUMERIC;
  total_is NUMERIC;
BEGIN
  -- Calculate new totals
  SELECT 
    SUM(iuran_wajib),
    SUM(iuran_sukarela), 
    SUM(simpanan_wajib)
  INTO total_iw, total_is, total_sw
  FROM dues;
  
  -- Log the results
  RAISE NOTICE 'After fix - Total Iuran Wajib: %, Total Iuran Sukarela: %, Total Simpanan Wajib: %', 
    total_iw, total_is, total_sw;
  
  -- Check if targets are met
  IF total_iw = 19800000 AND total_sw = 37200000 THEN
    RAISE NOTICE 'SUCCESS: Totals now match Excel data!';
  ELSE
    RAISE NOTICE 'WARNING: Totals still do not match. Expected IW: 19800000, SW: 37200000';
  END IF;
END $$;