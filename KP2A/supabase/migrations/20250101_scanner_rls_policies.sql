-- =====================================================
-- KP2A Cimahi - Scanner System RLS Policies
-- Created: 2025-01-01
-- Purpose: Row Level Security for scanner system tables
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL SCANNER TABLES
-- =====================================================

ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_verification_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_scan_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SCAN SESSIONS POLICIES
-- =====================================================

-- Users can view their own scan sessions
CREATE POLICY "Users can view own scan sessions" ON scan_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own scan sessions
CREATE POLICY "Users can create own scan sessions" ON scan_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own scan sessions
CREATE POLICY "Users can update own scan sessions" ON scan_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all scan sessions
CREATE POLICY "Admins can view all scan sessions" ON scan_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- SCAN RESULTS POLICIES
-- =====================================================

-- Users can view their own scan results
CREATE POLICY "Users can view own scan results" ON scan_results
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own scan results
CREATE POLICY "Users can create own scan results" ON scan_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own scan results
CREATE POLICY "Users can update own scan results" ON scan_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all scan results
CREATE POLICY "Admins can view all scan results" ON scan_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- SCAN HISTORY POLICIES
-- =====================================================

-- Users can view their own scan history
CREATE POLICY "Users can view own scan history" ON scan_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own scan history entries
CREATE POLICY "Users can create own scan history" ON scan_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all scan history
CREATE POLICY "Admins can view all scan history" ON scan_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- MEMBER VERIFICATION SCANS POLICIES
-- =====================================================

-- Users can view their own member verification scans
CREATE POLICY "Users can view own member verification scans" ON member_verification_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = member_verification_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Users can create member verification scans for their own scan results
CREATE POLICY "Users can create own member verification scans" ON member_verification_scans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = member_verification_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Users can update their own member verification scans
CREATE POLICY "Users can update own member verification scans" ON member_verification_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = member_verification_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Admins and verifiers can view all member verification scans
CREATE POLICY "Admins can view all member verification scans" ON member_verification_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'verifier')
        )
    );

-- Admins and verifiers can update verification status
CREATE POLICY "Admins can update member verification scans" ON member_verification_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'verifier')
        )
    );

-- =====================================================
-- PAYMENT SCANS POLICIES
-- =====================================================

-- Users can view their own payment scans
CREATE POLICY "Users can view own payment scans" ON payment_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = payment_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Users can create payment scans for their own scan results
CREATE POLICY "Users can create own payment scans" ON payment_scans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = payment_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Users can update their own payment scans
CREATE POLICY "Users can update own payment scans" ON payment_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = payment_scans.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Admins and financial staff can view all payment scans
CREATE POLICY "Financial staff can view all payment scans" ON payment_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'financial', 'treasurer')
        )
    );

-- Admins and financial staff can update payment status
CREATE POLICY "Financial staff can update payment scans" ON payment_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'financial', 'treasurer')
        )
    );

-- =====================================================
-- WHATSAPP SCAN COMMANDS POLICIES
-- =====================================================

-- Users can view their own WhatsApp scan commands
CREATE POLICY "Users can view own whatsapp scan commands" ON whatsapp_scan_commands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = whatsapp_scan_commands.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- Users can create WhatsApp scan commands for their own scan results
CREATE POLICY "Users can create own whatsapp scan commands" ON whatsapp_scan_commands
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scan_results 
            WHERE scan_results.id = whatsapp_scan_commands.scan_result_id 
            AND scan_results.user_id = auth.uid()
        )
    );

-- WhatsApp bot service can create and update commands (service role)
CREATE POLICY "Service can manage whatsapp scan commands" ON whatsapp_scan_commands
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all WhatsApp scan commands
CREATE POLICY "Admins can view all whatsapp scan commands" ON whatsapp_scan_commands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- SCAN AUDIT LOGS POLICIES
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Only admins can view scan audit logs" ON scan_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- System can create audit logs (triggered automatically)
CREATE POLICY "System can create scan audit logs" ON scan_audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS TO ROLES
-- =====================================================

-- Grant basic permissions to anon role (for public scanner access)
GRANT SELECT ON scan_sessions TO anon;
GRANT INSERT ON scan_sessions TO anon;
GRANT UPDATE ON scan_sessions TO anon;

GRANT SELECT ON scan_results TO anon;
GRANT INSERT ON scan_results TO anon;
GRANT UPDATE ON scan_results TO anon;

GRANT SELECT ON scan_history TO anon;
GRANT INSERT ON scan_history TO anon;

-- Grant permissions to authenticated users
GRANT ALL ON scan_sessions TO authenticated;
GRANT ALL ON scan_results TO authenticated;
GRANT ALL ON scan_history TO authenticated;
GRANT ALL ON member_verification_scans TO authenticated;
GRANT ALL ON payment_scans TO authenticated;
GRANT ALL ON whatsapp_scan_commands TO authenticated;

-- Grant audit log permissions
GRANT SELECT ON scan_audit_logs TO authenticated;
GRANT INSERT ON scan_audit_logs TO authenticated;

-- Grant service role full access (for WhatsApp bot)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access scan result
CREATE OR REPLACE FUNCTION can_access_scan_result(scan_result_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM scan_results 
        WHERE scan_results.id = scan_result_id 
        AND (
            scan_results.user_id = auth.uid() 
            OR is_admin()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate scan data
CREATE OR REPLACE FUNCTION validate_scan_data(data TEXT, format TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic validation logic
    IF data IS NULL OR LENGTH(data) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Format-specific validation
    CASE format
        WHEN 'qr_code' THEN
            RETURN LENGTH(data) <= 4296; -- QR code max capacity
        WHEN 'code_128' THEN
            RETURN LENGTH(data) <= 80;
        WHEN 'ean_13' THEN
            RETURN LENGTH(data) = 13 AND data ~ '^[0-9]+$';
        WHEN 'ean_8' THEN
            RETURN LENGTH(data) = 8 AND data ~ '^[0-9]+$';
        ELSE
            RETURN TRUE; -- Allow other formats
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Users can view own scan sessions" ON scan_sessions IS 'Users can only view their own scan sessions';
COMMENT ON POLICY "Admins can view all scan sessions" ON scan_sessions IS 'Admin users can view all scan sessions for monitoring';
COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user is admin';
COMMENT ON FUNCTION can_access_scan_result(UUID) IS 'Helper function to check scan result access permissions';
COMMENT ON FUNCTION validate_scan_data(TEXT, TEXT) IS 'Validates scan data based on barcode format';