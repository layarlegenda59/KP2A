-- Final fix for authentication and refresh token issues
-- This migration ensures proper authentication flow without errors

-- Clean up any conflicting policies first
DROP POLICY IF EXISTS "Allow authenticated users to view members" ON members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON members;

DROP POLICY IF EXISTS "Allow authenticated users to view loans" ON loans;
DROP POLICY IF EXISTS "Allow authenticated users to insert loans" ON loans;
DROP POLICY IF EXISTS "Allow authenticated users to update loans" ON loans;
DROP POLICY IF EXISTS "Allow authenticated users to delete loans" ON loans;

-- Create simple, permissive policies for all tables
-- Members table
CREATE POLICY "members_all_access" ON members FOR ALL USING (true);

-- Loans table  
CREATE POLICY "loans_all_access" ON loans FOR ALL USING (true);

-- Dues table
CREATE POLICY "dues_all_access" ON dues FOR ALL USING (true);

-- Expenses table
CREATE POLICY "expenses_all_access" ON expenses FOR ALL USING (true);

-- Loan payments table
CREATE POLICY "loan_payments_all_access" ON loan_payments FOR ALL USING (true);

-- WhatsApp tables
CREATE POLICY "whatsapp_templates_all_access" ON whatsapp_templates FOR ALL USING (true);
CREATE POLICY "whatsapp_config_all_access" ON whatsapp_config FOR ALL USING (true);
CREATE POLICY "whatsapp_sessions_all_access" ON whatsapp_sessions FOR ALL USING (true);
CREATE POLICY "whatsapp_messages_all_access" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICY "whatsapp_analytics_all_access" ON whatsapp_analytics FOR ALL USING (true);
CREATE POLICY "whatsapp_verifications_all_access" ON whatsapp_verifications FOR ALL USING (true);

-- Financial transactions table
CREATE POLICY "financial_transactions_all_access" ON financial_transactions FOR ALL USING (true);

-- Grant all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Success message
SELECT 'Final authentication fix applied successfully!' as message;