-- Create WhatsApp Sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp Messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    remote_jid VARCHAR(255) NOT NULL,
    from_me BOOLEAN NOT NULL DEFAULT FALSE,
    participant VARCHAR(255),
    message_type VARCHAR(100) NOT NULL,
    content TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at 
    BEFORE UPDATE ON whatsapp_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at 
    BEFORE UPDATE ON whatsapp_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_sessions
CREATE POLICY "Allow authenticated users to view whatsapp_sessions" 
    ON whatsapp_sessions FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert whatsapp_sessions" 
    ON whatsapp_sessions FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update whatsapp_sessions" 
    ON whatsapp_sessions FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to delete whatsapp_sessions" 
    ON whatsapp_sessions FOR DELETE 
    TO authenticated 
    USING (true);

-- Create RLS policies for whatsapp_messages
CREATE POLICY "Allow authenticated users to view whatsapp_messages" 
    ON whatsapp_messages FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert whatsapp_messages" 
    ON whatsapp_messages FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update whatsapp_messages" 
    ON whatsapp_messages FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to delete whatsapp_messages" 
    ON whatsapp_messages FOR DELETE 
    TO authenticated 
    USING (true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert default session if not exists
INSERT INTO whatsapp_sessions (session_id, status) 
VALUES ('default_session', 'disconnected')
ON CONFLICT (session_id) DO NOTHING;