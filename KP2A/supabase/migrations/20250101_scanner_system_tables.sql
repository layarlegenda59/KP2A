-- =====================================================
-- KP2A Cimahi - Barcode Scanner System Database Schema
-- Created: 2025-01-01
-- Purpose: Complete scanner system with security and audit
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. SCAN SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scan_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('whatsapp', 'transaction', 'verification', 'general')),
    integration_context VARCHAR(100),
    device_info JSONB DEFAULT '{}',
    browser_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'error')),
    total_scans INTEGER DEFAULT 0,
    successful_scans INTEGER DEFAULT 0,
    failed_scans INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SCAN RESULTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES scan_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL,
    barcode_format VARCHAR(50) NOT NULL,
    raw_data TEXT NOT NULL,
    processed_data JSONB DEFAULT '{}',
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'suspicious')),
    validation_errors JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    camera_settings JSONB DEFAULT '{}',
    scan_location JSONB DEFAULT '{}', -- GPS coordinates if available
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES scan_results(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. SCAN HISTORY TABLE (for audit and analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS scan_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('scan', 'process', 'validate', 'use', 'delete')),
    action_details JSONB DEFAULT '{}',
    result_status VARCHAR(20),
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. MEMBER VERIFICATION SCANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS member_verification_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    member_id UUID, -- Reference to members table
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('membership_card', 'id_card', 'qr_code')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
    verification_data JSONB DEFAULT '{}',
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PAYMENT SCANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('qr_payment', 'bank_transfer', 'e_wallet', 'other')),
    payment_provider VARCHAR(100),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    merchant_info JSONB DEFAULT '{}',
    payment_reference VARCHAR(255),
    transaction_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. WHATSAPP SCAN COMMANDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_scan_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_result_id UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    whatsapp_session_id VARCHAR(255),
    phone_number VARCHAR(20),
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('member_verify', 'payment_scan', 'info_request', 'custom')),
    command_data JSONB DEFAULT '{}',
    response_sent BOOLEAN DEFAULT FALSE,
    response_data JSONB DEFAULT '{}',
    response_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. SCAN AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scan_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Scan Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_type ON scan_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_created_at ON scan_sessions(created_at);

-- Scan Results Indexes
CREATE INDEX IF NOT EXISTS idx_scan_results_session_id ON scan_results(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_type ON scan_results(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_results_format ON scan_results(barcode_format);
CREATE INDEX IF NOT EXISTS idx_scan_results_validation ON scan_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at);

-- Scan History Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_scan_result_id ON scan_history(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_action ON scan_history(action_type);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at);

-- Member Verification Indexes
CREATE INDEX IF NOT EXISTS idx_member_verification_scan_result_id ON member_verification_scans(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_member_verification_member_id ON member_verification_scans(member_id);
CREATE INDEX IF NOT EXISTS idx_member_verification_status ON member_verification_scans(verification_status);

-- Payment Scans Indexes
CREATE INDEX IF NOT EXISTS idx_payment_scans_scan_result_id ON payment_scans(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_payment_scans_type ON payment_scans(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_scans_status ON payment_scans(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_scans_reference ON payment_scans(payment_reference);

-- WhatsApp Scan Commands Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_scan_commands_scan_result_id ON whatsapp_scan_commands(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scan_commands_session_id ON whatsapp_scan_commands(whatsapp_session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scan_commands_phone ON whatsapp_scan_commands(phone_number);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_scan_audit_logs_table_record ON scan_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_logs_user_id ON scan_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_logs_created_at ON scan_audit_logs(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at column
CREATE TRIGGER update_scan_sessions_updated_at 
    BEFORE UPDATE ON scan_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_verification_scans_updated_at 
    BEFORE UPDATE ON member_verification_scans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_scans_updated_at 
    BEFORE UPDATE ON payment_scans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUDIT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO scan_audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO scan_audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO scan_audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to all scanner tables
CREATE TRIGGER audit_scan_sessions 
    AFTER INSERT OR UPDATE OR DELETE ON scan_sessions 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_scan_results 
    AFTER INSERT OR UPDATE OR DELETE ON scan_results 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_member_verification_scans 
    AFTER INSERT OR UPDATE OR DELETE ON member_verification_scans 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payment_scans 
    AFTER INSERT OR UPDATE OR DELETE ON payment_scans 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_whatsapp_scan_commands 
    AFTER INSERT OR UPDATE OR DELETE ON whatsapp_scan_commands 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE scan_sessions IS 'Tracks individual scanner sessions with device and browser info';
COMMENT ON TABLE scan_results IS 'Stores all scan results with validation and processing details';
COMMENT ON TABLE scan_history IS 'Audit trail for all scan-related actions';
COMMENT ON TABLE member_verification_scans IS 'Member verification through barcode/QR scanning';
COMMENT ON TABLE payment_scans IS 'Payment-related QR code scans and processing';
COMMENT ON TABLE whatsapp_scan_commands IS 'WhatsApp bot integration for scan commands';
COMMENT ON TABLE scan_audit_logs IS 'Complete audit log for all scanner table changes';