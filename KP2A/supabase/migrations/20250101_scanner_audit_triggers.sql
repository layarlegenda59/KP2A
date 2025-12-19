-- =====================================================
-- KP2A Cimahi - Scanner System Audit Triggers
-- Created: 2025-01-01
-- Purpose: Automatic audit logging for scanner operations
-- =====================================================

-- =====================================================
-- AUDIT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_scanner_audit()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
    operation_type TEXT;
    table_name TEXT;
BEGIN
    -- Determine operation type
    operation_type := TG_OP;
    table_name := TG_TABLE_NAME;
    
    -- Prepare audit data based on operation
    CASE operation_type
        WHEN 'INSERT' THEN
            audit_data := to_jsonb(NEW);
        WHEN 'UPDATE' THEN
            audit_data := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW),
                'changes', to_jsonb(NEW) - to_jsonb(OLD)
            );
        WHEN 'DELETE' THEN
            audit_data := to_jsonb(OLD);
        ELSE
            audit_data := '{}';
    END CASE;
    
    -- Insert audit log
    INSERT INTO scan_audit_logs (
        table_name,
        operation_type,
        record_id,
        user_id,
        audit_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        table_name,
        operation_type,
        COALESCE(
            (CASE WHEN operation_type = 'DELETE' THEN OLD.id ELSE NEW.id END),
            gen_random_uuid()
        ),
        auth.uid(),
        audit_data,
        COALESCE(
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'x-real-ip',
            inet_client_addr()::text
        ),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW()
    );
    
    -- Return appropriate record
    CASE operation_type
        WHEN 'DELETE' THEN RETURN OLD;
        ELSE RETURN NEW;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE AUDIT TRIGGERS
-- =====================================================

-- Scan Sessions Audit
DROP TRIGGER IF EXISTS scan_sessions_audit_trigger ON scan_sessions;
CREATE TRIGGER scan_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON scan_sessions
    FOR EACH ROW EXECUTE FUNCTION log_scanner_audit();

-- Scan Results Audit
DROP TRIGGER IF EXISTS scan_results_audit_trigger ON scan_results;
CREATE TRIGGER scan_results_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON scan_results
    FOR EACH ROW EXECUTE FUNCTION log_scanner_audit();

-- Member Verification Scans Audit
DROP TRIGGER IF EXISTS member_verification_scans_audit_trigger ON member_verification_scans;
CREATE TRIGGER member_verification_scans_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON member_verification_scans
    FOR EACH ROW EXECUTE FUNCTION log_scanner_audit();

-- Payment Scans Audit
DROP TRIGGER IF EXISTS payment_scans_audit_trigger ON payment_scans;
CREATE TRIGGER payment_scans_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment_scans
    FOR EACH ROW EXECUTE FUNCTION log_scanner_audit();

-- WhatsApp Scan Commands Audit
DROP TRIGGER IF EXISTS whatsapp_scan_commands_audit_trigger ON whatsapp_scan_commands;
CREATE TRIGGER whatsapp_scan_commands_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON whatsapp_scan_commands
    FOR EACH ROW EXECUTE FUNCTION log_scanner_audit();

-- =====================================================
-- SECURITY EVENT LOGGING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    event_details JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO scan_audit_logs (
        table_name,
        operation_type,
        record_id,
        user_id,
        audit_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        'security_events',
        event_type,
        gen_random_uuid(),
        auth.uid(),
        jsonb_build_object(
            'event_type', event_type,
            'severity', severity,
            'details', event_details,
            'timestamp', extract(epoch from now())
        ),
        COALESCE(
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'x-real-ip',
            inet_client_addr()::text
        ),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================

-- Function to log scan performance metrics
CREATE OR REPLACE FUNCTION log_scan_performance(
    scan_session_id UUID,
    scan_duration_ms INTEGER,
    processing_time_ms INTEGER,
    camera_init_time_ms INTEGER DEFAULT NULL,
    decode_attempts INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO scan_audit_logs (
        table_name,
        operation_type,
        record_id,
        user_id,
        audit_data,
        created_at
    ) VALUES (
        'performance_metrics',
        'PERFORMANCE_LOG',
        scan_session_id,
        auth.uid(),
        jsonb_build_object(
            'scan_duration_ms', scan_duration_ms,
            'processing_time_ms', processing_time_ms,
            'camera_init_time_ms', camera_init_time_ms,
            'decode_attempts', decode_attempts,
            'timestamp', extract(epoch from now())
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scan_audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup operation
    PERFORM log_security_event(
        'AUDIT_CLEANUP',
        jsonb_build_object('deleted_records', deleted_count),
        'info'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULED CLEANUP (requires pg_cron extension)
-- =====================================================

-- Note: This requires pg_cron extension to be enabled
-- Uncomment the following line if pg_cron is available:
-- SELECT cron.schedule('cleanup-scanner-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');

-- =====================================================
-- AUDIT QUERY HELPERS
-- =====================================================

-- Function to get audit trail for a specific record
CREATE OR REPLACE FUNCTION get_audit_trail(
    target_table_name TEXT,
    target_record_id UUID,
    limit_records INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    operation_type TEXT,
    user_id UUID,
    audit_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.id,
        sal.operation_type,
        sal.user_id,
        sal.audit_data,
        sal.ip_address,
        sal.user_agent,
        sal.created_at
    FROM scan_audit_logs sal
    WHERE sal.table_name = target_table_name
    AND sal.record_id = target_record_id
    ORDER BY sal.created_at DESC
    LIMIT limit_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security events
CREATE OR REPLACE FUNCTION get_security_events(
    event_type_filter TEXT DEFAULT NULL,
    severity_filter TEXT DEFAULT NULL,
    hours_back INTEGER DEFAULT 24,
    limit_records INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    severity TEXT,
    details JSONB,
    user_id UUID,
    ip_address TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.id,
        sal.operation_type as event_type,
        sal.audit_data->>'severity' as severity,
        sal.audit_data->'details' as details,
        sal.user_id,
        sal.ip_address,
        sal.created_at
    FROM scan_audit_logs sal
    WHERE sal.table_name = 'security_events'
    AND sal.created_at > NOW() - (hours_back || ' hours')::INTERVAL
    AND (event_type_filter IS NULL OR sal.operation_type = event_type_filter)
    AND (severity_filter IS NULL OR sal.audit_data->>'severity' = severity_filter)
    ORDER BY sal.created_at DESC
    LIMIT limit_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION log_scanner_audit() IS 'Automatic audit logging trigger function for scanner operations';
COMMENT ON FUNCTION log_security_event(TEXT, JSONB, TEXT) IS 'Logs security events with severity levels';
COMMENT ON FUNCTION log_scan_performance(UUID, INTEGER, INTEGER, INTEGER, INTEGER) IS 'Logs performance metrics for scan operations';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Removes audit logs older than 90 days';
COMMENT ON FUNCTION get_audit_trail(TEXT, UUID, INTEGER) IS 'Retrieves audit trail for a specific record';
COMMENT ON FUNCTION get_security_events(TEXT, TEXT, INTEGER, INTEGER) IS 'Retrieves security events with filtering options';