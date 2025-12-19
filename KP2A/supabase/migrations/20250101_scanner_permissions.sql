-- =====================================================
-- KP2A Cimahi - Scanner System Permissions
-- Created: 2025-01-01
-- Purpose: Grant proper permissions to scanner tables
-- =====================================================

-- Grant permissions to anon role for basic read access
GRANT SELECT ON scan_sessions TO anon;
GRANT SELECT ON scan_results TO anon;
GRANT SELECT ON scan_history TO anon;
GRANT SELECT ON member_verification_scans TO anon;
GRANT SELECT ON payment_scans TO anon;
GRANT SELECT ON whatsapp_scan_commands TO anon;
GRANT SELECT ON scan_audit_logs TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON scan_sessions TO authenticated;
GRANT ALL PRIVILEGES ON scan_results TO authenticated;
GRANT ALL PRIVILEGES ON scan_history TO authenticated;
GRANT ALL PRIVILEGES ON member_verification_scans TO authenticated;
GRANT ALL PRIVILEGES ON payment_scans TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_scan_commands TO authenticated;
GRANT ALL PRIVILEGES ON scan_audit_logs TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on scanner functions
GRANT EXECUTE ON FUNCTION log_scanner_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_scan_performance(UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Ensure proper permissions for auth schema access
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;