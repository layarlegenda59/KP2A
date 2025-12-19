-- WhatsApp Bot Integration Schema Migration
-- This migration creates all necessary tables for the WhatsApp Bot Integration feature

-- Create WhatsApp sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending', 'error')),
    qr_code TEXT,
    connected_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for whatsapp_sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);

-- Enable RLS for whatsapp_sessions
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_sessions
DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_sessions" ON whatsapp_sessions;
CREATE POLICY "Allow authenticated users to manage whatsapp_sessions" ON whatsapp_sessions
    FOR ALL USING (true);

-- Create WhatsApp verifications table
CREATE TABLE IF NOT EXISTS whatsapp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for whatsapp_verifications
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_member_id ON whatsapp_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_phone ON whatsapp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_verified ON whatsapp_verifications(is_verified);

-- Enable RLS for whatsapp_verifications
ALTER TABLE whatsapp_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_verifications
DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_verifications" ON whatsapp_verifications;
CREATE POLICY "Allow authenticated users to manage whatsapp_verifications" ON whatsapp_verifications
    FOR ALL USING (true);

-- Create message templates table (enhanced version of whatsapp_templates)
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('welcome', 'menu', 'balance', 'loan', 'error', 'help')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- Enable RLS for message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for message_templates
DROP POLICY IF EXISTS "Allow authenticated users to manage message_templates" ON message_templates;
CREATE POLICY "Allow authenticated users to manage message_templates" ON message_templates
    FOR ALL USING (true);

-- Update existing whatsapp_messages table to match technical architecture
-- Now that message_templates exists, we can add the foreign key reference
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'session_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'verification_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN verification_id UUID REFERENCES whatsapp_verifications(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'message_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN message_id VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'from_number') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN from_number VARCHAR(20) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'to_number') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN to_number VARCHAR(20) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'content') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'message_type') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'direction') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'template_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'metadata') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create additional indexes for whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_verification_id ON whatsapp_messages(verification_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);

-- Create WhatsApp analytics table
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analytics_date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    command_stats JSONB DEFAULT '{}',
    avg_response_time DECIMAL(10,2) DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for whatsapp_analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_analytics_date ON whatsapp_analytics(analytics_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_created_at ON whatsapp_analytics(created_at DESC);

-- Enable RLS for whatsapp_analytics
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_analytics
DROP POLICY IF EXISTS "Allow authenticated users to view whatsapp_analytics" ON whatsapp_analytics;
CREATE POLICY "Allow authenticated users to view whatsapp_analytics" ON whatsapp_analytics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert whatsapp_analytics" ON whatsapp_analytics;
CREATE POLICY "Allow authenticated users to insert whatsapp_analytics" ON whatsapp_analytics
    FOR INSERT WITH CHECK (true);

-- Grant permissions to anon and authenticated roles for all WhatsApp tables
GRANT ALL PRIVILEGES ON whatsapp_sessions TO anon, authenticated;
GRANT ALL PRIVILEGES ON whatsapp_verifications TO anon, authenticated;
GRANT ALL PRIVILEGES ON message_templates TO anon, authenticated;
GRANT ALL PRIVILEGES ON whatsapp_analytics TO anon, authenticated;

-- Update existing table permissions
GRANT ALL PRIVILEGES ON whatsapp_messages TO anon, authenticated;
GRANT ALL PRIVILEGES ON whatsapp_templates TO anon, authenticated;
GRANT ALL PRIVILEGES ON whatsapp_config TO anon, authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER update_whatsapp_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_verifications_updated_at ON whatsapp_verifications;
CREATE TRIGGER update_whatsapp_verifications_updated_at
    BEFORE UPDATE ON whatsapp_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();