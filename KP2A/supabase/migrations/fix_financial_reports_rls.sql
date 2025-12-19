-- Fix RLS policies for financial_reports table
-- This migration creates proper RLS policies for the financial_reports table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view financial reports" ON financial_reports;
DROP POLICY IF EXISTS "Authenticated users can insert financial reports" ON financial_reports;
DROP POLICY IF EXISTS "Authenticated users can update financial reports" ON financial_reports;
DROP POLICY IF EXISTS "Authenticated users can delete financial reports" ON financial_reports;

-- Ensure RLS is enabled on financial_reports table
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_reports table
-- Policy for viewing financial reports
CREATE POLICY "Authenticated users can view financial reports" ON financial_reports
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for inserting financial reports
CREATE POLICY "Authenticated users can insert financial reports" ON financial_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Policy for updating financial reports
CREATE POLICY "Authenticated users can update financial reports" ON financial_reports
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy for deleting financial reports
CREATE POLICY "Authenticated users can delete financial reports" ON financial_reports
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Grant necessary permissions to authenticated users
GRANT ALL ON financial_reports TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_financial_reports_periode ON financial_reports(periode_start, periode_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_tipe ON financial_reports(tipe_laporan);