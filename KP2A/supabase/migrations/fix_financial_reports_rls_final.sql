-- Fix RLS policies for financial_reports table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "financial_reports_select_policy" ON financial_reports;
DROP POLICY IF EXISTS "financial_reports_insert_policy" ON financial_reports;
DROP POLICY IF EXISTS "financial_reports_update_policy" ON financial_reports;
DROP POLICY IF EXISTS "financial_reports_delete_policy" ON financial_reports;

-- Ensure RLS is enabled
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies that allow all operations for authenticated users
-- SELECT policy - allow all authenticated users to view all reports
CREATE POLICY "financial_reports_select_policy" ON financial_reports
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- INSERT policy - allow all authenticated users to insert reports
CREATE POLICY "financial_reports_insert_policy" ON financial_reports
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- UPDATE policy - allow all authenticated users to update reports
CREATE POLICY "financial_reports_update_policy" ON financial_reports
    FOR UPDATE
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- DELETE policy - allow all authenticated users to delete reports
CREATE POLICY "financial_reports_delete_policy" ON financial_reports
    FOR DELETE
    TO authenticated, anon
    USING (true);

-- Grant necessary permissions
GRANT ALL ON financial_reports TO authenticated;
GRANT ALL ON financial_reports TO anon;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_financial_reports_periode ON financial_reports(periode_start, periode_end);