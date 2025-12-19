-- Fix RLS policies for transaction_categories and payment_methods tables
-- This migration allows authenticated users to manage categories and payment methods

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Everyone can view active categories" ON transaction_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON transaction_categories;
DROP POLICY IF EXISTS "Everyone can view active payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;

-- Create new policies for transaction_categories
-- Allow everyone to view active categories
CREATE POLICY "Everyone can view active categories" ON transaction_categories
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to insert new categories
CREATE POLICY "Authenticated users can insert categories" ON transaction_categories
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update categories
CREATE POLICY "Authenticated users can update categories" ON transaction_categories
    FOR UPDATE 
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to delete categories
CREATE POLICY "Admins can delete categories" ON transaction_categories
    FOR DELETE 
    TO authenticated
    USING ((auth.jwt() ->> 'role') = 'admin');

-- Create new policies for payment_methods
-- Allow everyone to view active payment methods
CREATE POLICY "Everyone can view active payment methods" ON payment_methods
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to insert new payment methods
CREATE POLICY "Authenticated users can insert payment methods" ON payment_methods
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update payment methods
CREATE POLICY "Authenticated users can update payment methods" ON payment_methods
    FOR UPDATE 
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to delete payment methods
CREATE POLICY "Admins can delete payment methods" ON payment_methods
    FOR DELETE 
    TO authenticated
    USING ((auth.jwt() ->> 'role') = 'admin');

-- Ensure proper permissions are granted
GRANT SELECT ON transaction_categories TO anon, authenticated;
GRANT INSERT, UPDATE ON transaction_categories TO authenticated;
GRANT SELECT ON payment_methods TO anon, authenticated;
GRANT INSERT, UPDATE ON payment_methods TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Transaction categories and payment methods RLS policies updated successfully';
    RAISE NOTICE 'Authenticated users can now create and update categories and payment methods';
END $$;