-- Test data untuk memverifikasi urutan tanggal dari awal ke akhir

-- Insert beberapa transaksi dengan tanggal yang berbeda
INSERT INTO transactions (
  description,
  amount,
  transaction_type,
  transaction_date,
  category_id,
  payment_method_id,
  status,
  created_by
) VALUES 
-- Transaksi paling awal (Januari 2024)
(
  'Transaksi Januari 2024 (Paling Awal)',
  100000,
  'income',
  '2024-01-15',
  (SELECT id FROM transaction_categories WHERE type = 'income' LIMIT 1),
  (SELECT id FROM payment_methods LIMIT 1),
  'approved',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Transaksi tengah (Juni 2024)
(
  'Transaksi Juni 2024 (Tengah)',
  75000,
  'expense',
  '2024-06-15',
  (SELECT id FROM transaction_categories WHERE type = 'expense' LIMIT 1),
  (SELECT id FROM payment_methods LIMIT 1),
  'approved',
  (SELECT id FROM auth.users LIMIT 1)
),
-- Transaksi terbaru (Desember 2024)
(
  'Transaksi Desember 2024 (Terbaru)',
  200000,
  'income',
  '2024-12-15',
  (SELECT id FROM transaction_categories WHERE type = 'income' LIMIT 1),
  (SELECT id FROM payment_methods LIMIT 1),
  'approved',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Verifikasi urutan transaksi berdasarkan tanggal (ascending)
SELECT 
  description,
  transaction_date,
  amount,
  transaction_type
FROM transactions 
WHERE description LIKE '%2024%'
ORDER BY transaction_date ASC;