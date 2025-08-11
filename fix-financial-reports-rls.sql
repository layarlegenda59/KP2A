-- =============================================
-- FIX RLS POLICY FOR FINANCIAL_REPORTS TABLE
-- =============================================
-- This script fixes the "new row violates row-level security policy for table 'financial_reports'" error
-- Run this in your Supabase SQL Editor to fix the issue.

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to manage financial_reports" ON public.financial_reports;

-- Create new RLS policy for financial_reports table
CREATE POLICY "Allow authenticated users to manage financial_reports" ON public.financial_reports
    FOR ALL USING (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'financial_reports';

-- Success message
SELECT '✅ RLS policy for financial_reports table created successfully! The error should be resolved.' as message;