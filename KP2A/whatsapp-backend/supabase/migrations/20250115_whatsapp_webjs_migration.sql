-- WhatsApp Web.js Migration
-- This migration adds necessary columns and tables for whatsapp-web.js integration

-- Add phone_number column to whatsapp_sessions if not exists
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_is_active ON whatsapp_sessions(is_active);

-- Add additional columns to whatsapp_messages for whatsapp-web.js compatibility
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS timestamp BIGINT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS quoted_message_id VARCHAR(255);

-- Add indexes for message queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number ON whatsapp_messages(to_number);

-- Create whatsapp_contacts table for contact management
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    contact_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(255),
    profile_picture TEXT,
    is_group BOOLEAN DEFAULT false,
    is_business BOOLEAN DEFAULT false,
    contact_data JSONB DEFAULT '{}',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, contact_id)
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_id ON whatsapp_contacts(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_is_group ON whatsapp_contacts(is_group);

-- Create whatsapp_settings table for bot configuration
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, setting_key)
);

-- Create index for settings
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_session_id ON whatsapp_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_key ON whatsapp_settings(setting_key);

-- Create whatsapp_session_events table for logging session events
CREATE TABLE IF NOT EXISTS whatsapp_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for session events
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_session_id ON whatsapp_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_type ON whatsapp_session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_created_at ON whatsapp_session_events(created_at);

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER update_whatsapp_sessions_updated_at 
    BEFORE UPDATE ON whatsapp_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_contacts_updated_at ON whatsapp_contacts;
CREATE TRIGGER update_whatsapp_contacts_updated_at 
    BEFORE UPDATE ON whatsapp_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_settings_updated_at ON whatsapp_settings;
CREATE TRIGGER update_whatsapp_settings_updated_at 
    BEFORE UPDATE ON whatsapp_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_session_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_contacts
CREATE POLICY "Allow authenticated users to view contacts" ON whatsapp_contacts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage contacts" ON whatsapp_contacts
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for whatsapp_settings
CREATE POLICY "Allow authenticated users to view settings" ON whatsapp_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage settings" ON whatsapp_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for whatsapp_session_events
CREATE POLICY "Allow authenticated users to view session events" ON whatsapp_session_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create session events" ON whatsapp_session_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON whatsapp_contacts TO anon;
GRANT ALL PRIVILEGES ON whatsapp_contacts TO authenticated;

GRANT SELECT ON whatsapp_settings TO anon;
GRANT ALL PRIVILEGES ON whatsapp_settings TO authenticated;

GRANT SELECT ON whatsapp_session_events TO anon;
GRANT ALL PRIVILEGES ON whatsapp_session_events TO authenticated;

-- Insert default settings for whatsapp-web.js
INSERT INTO whatsapp_settings (setting_key, setting_value, description) VALUES
('auto_reply_enabled', 'true', 'Enable automatic replies to incoming messages'),
('welcome_message', '"Selamat datang di KP2A Cimahi! Silakan ketik HELP untuk melihat menu."', 'Default welcome message for new contacts'),
('business_hours', '{"start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}', 'Business hours configuration'),
('max_retry_attempts', '3', 'Maximum retry attempts for failed messages'),
('session_timeout', '3600', 'Session timeout in seconds')
ON CONFLICT (session_id, setting_key) DO NOTHING;

-- Update existing whatsapp_config table to be compatible
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES whatsapp_sessions(id),
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS api_token VARCHAR(255);

-- Create index for whatsapp_config
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_session_id ON whatsapp_config(session_id);