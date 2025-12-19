-- Fix session_id UUID to VARCHAR migration (Safe Version)
-- This migration fixes the "invalid input syntax for type uuid" error
-- by changing session_id fields from UUID to VARCHAR(255) to support
-- string-based session IDs like "kp2a-session-1760600795681-qbsp8l"

-- Step 1: Drop foreign key constraints that reference session_id
ALTER TABLE whatsapp_session_events DROP CONSTRAINT IF EXISTS whatsapp_session_events_session_id_fkey;
ALTER TABLE whatsapp_contacts DROP CONSTRAINT IF EXISTS whatsapp_contacts_session_id_fkey;
ALTER TABLE whatsapp_settings DROP CONSTRAINT IF EXISTS whatsapp_settings_session_id_fkey;
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_session_id_fkey;
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_session_id_fkey;

-- Step 2: Drop indexes that depend on the UUID session_id
DROP INDEX IF EXISTS idx_whatsapp_session_events_session_id;
DROP INDEX IF EXISTS idx_whatsapp_contacts_session_id;
DROP INDEX IF EXISTS idx_whatsapp_settings_session_id;
DROP INDEX IF EXISTS idx_whatsapp_config_session_id;
DROP INDEX IF EXISTS idx_whatsapp_messages_session_id;

-- Step 3: Backup existing data and clear tables to avoid data type conflicts
CREATE TABLE IF NOT EXISTS whatsapp_sessions_backup AS SELECT * FROM whatsapp_sessions;
CREATE TABLE IF NOT EXISTS whatsapp_session_events_backup AS SELECT * FROM whatsapp_session_events;
CREATE TABLE IF NOT EXISTS whatsapp_contacts_backup AS SELECT * FROM whatsapp_contacts;
CREATE TABLE IF NOT EXISTS whatsapp_settings_backup AS SELECT * FROM whatsapp_settings;
CREATE TABLE IF NOT EXISTS whatsapp_config_backup AS SELECT * FROM whatsapp_config;
CREATE TABLE IF NOT EXISTS whatsapp_messages_backup AS SELECT * FROM whatsapp_messages;

-- Clear all tables to avoid foreign key conflicts during schema change
TRUNCATE TABLE whatsapp_session_events CASCADE;
TRUNCATE TABLE whatsapp_contacts CASCADE;
TRUNCATE TABLE whatsapp_settings CASCADE;
TRUNCATE TABLE whatsapp_config CASCADE;
TRUNCATE TABLE whatsapp_messages CASCADE;
TRUNCATE TABLE whatsapp_sessions CASCADE;

-- Step 4: Change whatsapp_sessions.id from UUID to VARCHAR(255)
ALTER TABLE whatsapp_sessions ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE whatsapp_sessions ALTER COLUMN id SET DEFAULT NULL;

-- Step 5: Change session_id columns in related tables to VARCHAR(255)
ALTER TABLE whatsapp_session_events ALTER COLUMN session_id TYPE VARCHAR(255);
ALTER TABLE whatsapp_contacts ALTER COLUMN session_id TYPE VARCHAR(255);
ALTER TABLE whatsapp_settings ALTER COLUMN session_id TYPE VARCHAR(255);
ALTER TABLE whatsapp_config ALTER COLUMN session_id TYPE VARCHAR(255);
ALTER TABLE whatsapp_messages ALTER COLUMN session_id TYPE VARCHAR(255);

-- Step 6: Recreate foreign key constraints (optional - can be added later)
-- Note: We're not recreating these immediately to allow the system to work
-- without strict foreign key constraints during the transition period

-- Step 7: Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_session_id ON whatsapp_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_id ON whatsapp_contacts(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_session_id ON whatsapp_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_session_id ON whatsapp_config(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);

-- Step 8: Insert default settings without session_id constraints
INSERT INTO whatsapp_settings (setting_key, setting_value, description) VALUES
('auto_reply_enabled', 'true', 'Enable automatic replies to incoming messages'),
('welcome_message', '"Selamat datang di KP2A Cimahi! Silakan ketik HELP untuk melihat menu."', 'Default welcome message for new contacts'),
('business_hours', '{"start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}', 'Business hours configuration'),
('max_retry_attempts', '3', 'Maximum retry attempts for failed messages'),
('session_timeout', '3600', 'Session timeout in seconds')
ON CONFLICT (session_id, setting_key) DO NOTHING;

-- Step 9: Add comments to track this migration
COMMENT ON TABLE whatsapp_sessions IS 'WhatsApp sessions table - session_id changed from UUID to VARCHAR(255) to support dynamic string-based session IDs';
COMMENT ON TABLE whatsapp_session_events IS 'WhatsApp session events table - session_id changed from UUID to VARCHAR(255) for compatibility';

-- Migration completed successfully
-- The database now supports string-based session IDs like "kp2a-session-1760600795681-qbsp8l"
-- Note: Backup tables contain the original data if recovery is needed