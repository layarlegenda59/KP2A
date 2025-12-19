-- WhatsApp Migration to whatsapp-web.js
-- Create tables for WhatsApp sessions, messages, contacts, and settings

-- Create WhatsApp sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT false,
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    message_body TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    status VARCHAR(50) DEFAULT 'sent',
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp contacts table
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    contact_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    display_name VARCHAR(255),
    profile_picture TEXT,
    is_group BOOLEAN DEFAULT false,
    contact_data JSONB,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, contact_id)
);

-- Create WhatsApp settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, setting_key)
);

-- Create WhatsApp session events table for logging
CREATE TABLE IF NOT EXISTS whatsapp_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number ON whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_session_id ON whatsapp_contacts(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone_number ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_display_name ON whatsapp_contacts(display_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_session_id ON whatsapp_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_key ON whatsapp_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_session_id ON whatsapp_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_events_type ON whatsapp_session_events(event_type);

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_session_events ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_session_events TO authenticated;

-- Grant basic read access for anon users (if needed)
GRANT SELECT ON whatsapp_sessions TO anon;
GRANT SELECT ON whatsapp_messages TO anon;
GRANT SELECT ON whatsapp_contacts TO anon;
GRANT SELECT ON whatsapp_settings TO anon;
GRANT SELECT ON whatsapp_session_events TO anon;

-- Create RLS policies (basic policies - can be customized based on requirements)
CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_sessions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_messages
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_contacts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_session_events
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert default WhatsApp session
INSERT INTO whatsapp_sessions (session_id, phone_number, is_active)
VALUES ('kp2a-cimahi', NULL, false)
ON CONFLICT (session_id) DO NOTHING;

-- Insert default settings
INSERT INTO whatsapp_settings (session_id, setting_key, setting_value)
SELECT 
    id,
    'auto_reply_enabled',
    '{"enabled": true, "message": "Terima kasih telah menghubungi KP2A Cimahi. Pesan Anda akan segera direspon."}'::jsonb
FROM whatsapp_sessions WHERE session_id = 'kp2a-cimahi'
ON CONFLICT (session_id, setting_key) DO NOTHING;

INSERT INTO whatsapp_settings (session_id, setting_key, setting_value)
SELECT 
    id,
    'business_hours',
    '{"enabled": true, "start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}'::jsonb
FROM whatsapp_sessions WHERE session_id = 'kp2a-cimahi'
ON CONFLICT (session_id, setting_key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();