-- Create a test transaction for delete testing
-- This will help us verify that the delete functionality works

-- First, ensure we have a test user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"role": "admin"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Create a test transaction
INSERT INTO transactions (
  id,
  title,
  description,
  amount,
  type,
  category_id,
  payment_method_id,
  status,
  created_by,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Transaction for Delete',
  'This is a test transaction created for testing delete functionality',
  100000,
  'expense',
  (SELECT id FROM transaction_categories LIMIT 1),
  (SELECT id FROM payment_methods LIMIT 1),
  'pending',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  updated_at = NOW();

-- Verify the test transaction was created
SELECT 
  id,
  title,
  amount,
  created_by,
  created_at
FROM transactions 
WHERE id = '11111111-1111-1111-1111-111111111111';