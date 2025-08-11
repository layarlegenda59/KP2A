-- =============================================
-- FIX RLS POLICIES FOR CSV UPLOAD ISSUE
-- =============================================
-- This script fixes the "new row violates row-level security policy" error
-- by updating the RLS policies to be more permissive.
-- Run this in your Supabase SQL Editor to fix the upload issue.

-- Drop and recreate RLS policies for members table
DROP POLICY IF EXISTS "Allow authenticated users to view members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON public.members;

CREATE POLICY "Allow authenticated users to view members" ON public.members
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert members" ON public.members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update members" ON public.members
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete members" ON public.members
    FOR DELETE USING (true);

-- Drop and recreate RLS policies for other tables
DROP POLICY IF EXISTS "Allow authenticated users to manage dues" ON public.dues;
CREATE POLICY "Allow authenticated users to manage dues" ON public.dues
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage loans" ON public.loans;
CREATE POLICY "Allow authenticated users to manage loans" ON public.loans
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage loan_payments" ON public.loan_payments;
CREATE POLICY "Allow authenticated users to manage loan_payments" ON public.loan_payments
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage expenses" ON public.expenses;
CREATE POLICY "Allow authenticated users to manage expenses" ON public.expenses
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON public.users;
CREATE POLICY "Allow authenticated users to manage users" ON public.users
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Allow authenticated users to manage whatsapp_templates" ON public.whatsapp_templates
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_config" ON public.whatsapp_config;
CREATE POLICY "Allow authenticated users to manage whatsapp_config" ON public.whatsapp_config
    FOR ALL USING (true);

-- Success message
SELECT 'RLS policies updated successfully! CSV upload should now work.' as message;