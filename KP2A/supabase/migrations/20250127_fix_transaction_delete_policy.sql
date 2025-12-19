-- Fix RLS policy for transaction deletion
-- Allow users to delete their own transactions, not just admins

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;

-- Create a new policy that allows users to delete their own transactions
-- and admins/treasurers to delete any transaction
CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );