-- Reset WhatsApp Configuration and Sessions
-- This script resets all WhatsApp connection statuses to disconnected
-- and clears old session data to fix incorrect "connected" status

-- Reset WhatsApp Configuration
UPDATE whatsapp_config 
SET 
    is_connected = false,
    status = 'inactive',
    session_id = NULL,
    last_activity = now(),
    updated_at = now()
WHERE is_connected = true OR status = 'active';

-- Reset WhatsApp Sessions
UPDATE whatsapp_sessions 
SET 
    status = 'disconnected',
    is_active = false,
    qr_code = NULL,
    connected_at = NULL,
    expires_at = NULL,
    phone_number = NULL,
    client_name = NULL,
    session_data = '{}',
    updated_at = now()
WHERE status != 'disconnected' OR is_active = true;

-- Clean up expired or invalid sessions
DELETE FROM whatsapp_sessions 
WHERE expires_at < now() 
   OR (created_at < now() - INTERVAL '7 days' AND status = 'disconnected');

-- Insert audit log for this reset operation
INSERT INTO whatsapp_session_events (session_id, event_type, event_data, created_at)
SELECT 
    id,
    'status_reset',
    jsonb_build_object(
        'action', 'manual_reset',
        'reason', 'fix_incorrect_connected_status',
        'reset_at', now()
    ),
    now()
FROM whatsapp_sessions;

-- Verify the reset operation
SELECT 
    'whatsapp_config' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_connected = true THEN 1 END) as connected_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM whatsapp_config

UNION ALL

SELECT 
    'whatsapp_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM whatsapp_sessions;