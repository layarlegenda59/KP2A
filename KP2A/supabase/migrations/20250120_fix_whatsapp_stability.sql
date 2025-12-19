-- Fix WhatsApp Stability Issues
-- This migration fixes database schema issues that cause WhatsApp bot crashes

-- ============================================================================
-- 1. FIX WHATSAPP_MESSAGES TABLE SCHEMA
-- ============================================================================

-- Make receiver_phone nullable to prevent NOT NULL constraint errors
ALTER TABLE whatsapp_messages ALTER COLUMN receiver_phone DROP NOT NULL;

-- Add missing columns that the code expects
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- ============================================================================
-- 2. FIX WHATSAPP_ANALYTICS TABLE SCHEMA
-- ============================================================================

-- Add missing columns that the code expects
ALTER TABLE whatsapp_analytics 
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS request_content TEXT,
ADD COLUMN IF NOT EXISTS response_content TEXT,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- ============================================================================
-- 3. CREATE WHATSAPP_CONNECTION_LOGS TABLE FOR MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_connection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- 'connected', 'disconnected', 'reconnecting', 'error', 'qr_generated'
    event_message TEXT,
    error_details JSONB,
    connection_status VARCHAR(20) DEFAULT 'unknown',
    retry_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. CREATE WHATSAPP_HEALTH_CHECKS TABLE FOR MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(50) NOT NULL, -- 'connection', 'database', 'memory', 'session'
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
    details JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- WhatsApp Messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_receiver_phone ON whatsapp_messages(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_error_message ON whatsapp_messages(error_message);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_retry_count ON whatsapp_messages(retry_count);

-- WhatsApp Analytics indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_member_id ON whatsapp_analytics(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_phone_number ON whatsapp_analytics(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_success ON whatsapp_analytics(success);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_error_message ON whatsapp_analytics(error_message);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_session_id ON whatsapp_analytics(session_id);

-- Connection Logs indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_connection_logs_session_id ON whatsapp_connection_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connection_logs_event_type ON whatsapp_connection_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connection_logs_created_at ON whatsapp_connection_logs(created_at DESC);

-- Health Checks indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_health_checks_check_type ON whatsapp_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_health_checks_status ON whatsapp_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_health_checks_created_at ON whatsapp_health_checks(created_at DESC);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_health_checks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL PRIVILEGES ON whatsapp_connection_logs TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_health_checks TO authenticated;

GRANT SELECT ON whatsapp_connection_logs TO anon;
GRANT SELECT ON whatsapp_health_checks TO anon;

-- ============================================================================
-- 8. CREATE RLS POLICIES
-- ============================================================================

-- Connection Logs policies
DROP POLICY IF EXISTS "Allow authenticated users to manage connection logs" ON whatsapp_connection_logs;
CREATE POLICY "Allow authenticated users to manage connection logs" ON whatsapp_connection_logs
    FOR ALL USING (true);

-- Health Checks policies
DROP POLICY IF EXISTS "Allow authenticated users to manage health checks" ON whatsapp_health_checks;
CREATE POLICY "Allow authenticated users to manage health checks" ON whatsapp_health_checks
    FOR ALL USING (true);

-- ============================================================================
-- 9. CREATE FUNCTIONS FOR HEALTH MONITORING
-- ============================================================================

-- Function to log connection events
CREATE OR REPLACE FUNCTION log_whatsapp_connection_event(
    p_session_id VARCHAR(255),
    p_event_type VARCHAR(50),
    p_event_message TEXT DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL,
    p_connection_status VARCHAR(20) DEFAULT 'unknown',
    p_retry_attempt INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO whatsapp_connection_logs (
        session_id,
        event_type,
        event_message,
        error_details,
        connection_status,
        retry_attempt
    ) VALUES (
        p_session_id,
        p_event_type,
        p_event_message,
        p_error_details,
        p_connection_status,
        p_retry_attempt
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record health check
CREATE OR REPLACE FUNCTION record_health_check(
    p_check_type VARCHAR(50),
    p_status VARCHAR(20),
    p_details JSONB DEFAULT NULL,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    check_id UUID;
BEGIN
    INSERT INTO whatsapp_health_checks (
        check_type,
        status,
        details,
        response_time_ms
    ) VALUES (
        p_check_type,
        p_status,
        p_details,
        p_response_time_ms
    ) RETURNING id INTO check_id;
    
    RETURN check_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CLEANUP OLD DATA FUNCTION
-- ============================================================================

-- Function to cleanup old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_whatsapp_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Cleanup old connection logs
    DELETE FROM whatsapp_connection_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Cleanup old health checks
    DELETE FROM whatsapp_health_checks 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO whatsapp_analytics (
    analytics_date,
    command_type,
    created_at
) VALUES (
    CURRENT_DATE,
    'system',
    NOW()
);