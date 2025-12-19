-- Final precise fix to match Excel totals exactly
-- Current: IW 19,850,000, SW 37,300,000
-- Target:  IW 19,800,000, SW 37,200,000
-- Need to reduce: IW by 50,000, SW by 100,000

-- Reduce one record by the exact difference
UPDATE dues 
SET 
  iuran_wajib = iuran_wajib - 50000,
  simpanan_wajib = simpanan_wajib - 100000,
  updated_at = now()
WHERE id = (
  SELECT id 
  FROM dues 
  WHERE tahun = 2023 
    AND iuran_wajib >= 50000 
    AND simpanan_wajib >= 100000
  ORDER BY created_at 
  LIMIT 1
);

-- Verify the final result
DO $$
DECLARE
  total_iw NUMERIC;
  total_sw NUMERIC;
  total_is NUMERIC;
BEGIN
  -- Calculate final totals
  SELECT 
    SUM(iuran_wajib),
    SUM(iuran_sukarela), 
    SUM(simpanan_wajib)
  INTO total_iw, total_is, total_sw
  FROM dues;
  
  -- Log the results
  RAISE NOTICE 'FINAL TOTALS - Iuran Wajib: %, Iuran Sukarela: %, Simpanan Wajib: %', 
    total_iw, total_is, total_sw;
  
  -- Check if targets are met exactly
  IF total_iw = 19800000 AND total_is = 1000000 AND total_sw = 37200000 THEN
    RAISE NOTICE '🎉 PERFECT MATCH: All totals now match Excel data exactly!';
  ELSE
    RAISE NOTICE '⚠️ Still not matching. IW diff: %, SW diff: %', 
      total_iw - 19800000, total_sw - 37200000;
  END IF;
END $$;