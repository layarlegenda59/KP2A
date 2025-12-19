-- Simple test data creation for delete testing

-- Create a test transaction with correct column names
INSERT INTO transactions (
  description,
  amount,
  transaction_type,
  transaction_date,
  category_id,
  payment_method_id,
  status,
  created_by
) VALUES (
  'Test Transaction for Delete Testing',
  50000,
  'expense',
  CURRENT_DATE,
  (SELECT id FROM transaction_categories LIMIT 1),
  (SELECT id FROM payment_methods LIMIT 1),
  'pending',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Show the created transaction
SELECT 
  id,
  description,
  amount,
  transaction_type,
  created_by,
  created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 1;