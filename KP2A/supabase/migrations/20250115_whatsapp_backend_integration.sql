-- WhatsApp Backend Integration Migration
-- This migration creates the comprehensive schema for the WhatsApp Backend Integration

-- Create whatsapp_analytics table for tracking bot usage
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'command_usage', 'message_received', 'error', 'non_member_access', 'business_hours_access'
    phone_number VARCHAR(20),
    command VARCHAR(50),
    member_id UUID,
    session_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_templates table for managing bot responses
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to existing whatsapp_config table (if it exists)
DO $$
BEGIN
    -- Add business_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_config' AND column_name = 'business_hours') THEN
        ALTER TABLE whatsapp_config ADD COLUMN business_hours JSONB DEFAULT '{"enabled": true, "start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}'::jsonb;
    END IF;
    
    -- Add auto_reply_settings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_config' AND column_name = 'auto_reply_settings') THEN
        ALTER TABLE whatsapp_config ADD COLUMN auto_reply_settings JSONB DEFAULT '{"enabled": true, "welcome_message": "Selamat datang di KP2A Cimahi!"}'::jsonb;
    END IF;
    
    -- Add rate_limiting column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_config' AND column_name = 'rate_limiting') THEN
        ALTER TABLE whatsapp_config ADD COLUMN rate_limiting JSONB DEFAULT '{"enabled": true, "max_requests_per_minute": 10}'::jsonb;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Create whatsapp_config table if it doesn't exist
        CREATE TABLE whatsapp_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR(255) UNIQUE NOT NULL DEFAULT 'kp2a-cimahi',
            phone_number VARCHAR(20),
            is_active BOOLEAN DEFAULT false,
            business_hours JSONB DEFAULT '{"enabled": true, "start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}'::jsonb,
            auto_reply_settings JSONB DEFAULT '{"enabled": true, "welcome_message": "Selamat datang di KP2A Cimahi!"}'::jsonb,
            rate_limiting JSONB DEFAULT '{"enabled": true, "max_requests_per_minute": 10}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
END $$;

-- Add new columns to existing whatsapp_messages table (if it exists)
DO $$
BEGIN
    -- Add command column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'command') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN command VARCHAR(50);
    END IF;
    
    -- Add member_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'member_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN member_id UUID;
    END IF;
    
    -- Add response_template column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'response_template') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN response_template VARCHAR(100);
    END IF;
    
    -- Add processing_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'processing_time') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN processing_time INTEGER; -- in milliseconds
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist, skip
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_event_type ON whatsapp_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_phone_number ON whatsapp_analytics(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_command ON whatsapp_analytics(command);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_member_id ON whatsapp_analytics(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_created_at ON whatsapp_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_templates_name ON message_templates(name);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and anon roles
GRANT ALL PRIVILEGES ON whatsapp_analytics TO authenticated;
GRANT ALL PRIVILEGES ON message_templates TO authenticated;

-- Grant basic read access for anon users
GRANT SELECT ON whatsapp_analytics TO anon;
GRANT SELECT ON message_templates TO anon;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON whatsapp_analytics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for anon users" ON whatsapp_analytics
    FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY "Allow all operations for authenticated users" ON message_templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for anon users" ON message_templates
    FOR SELECT USING (auth.role() = 'anon');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for message_templates updated_at
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data for whatsapp_config
INSERT INTO whatsapp_config (session_id, phone_number, is_active)
VALUES ('kp2a-cimahi', NULL, false)
ON CONFLICT (session_id) DO NOTHING;

-- Insert default message templates
INSERT INTO message_templates (name, category, content, variables) VALUES
('welcome', 'greeting', 'Selamat datang di KP2A Cimahi! 👋\n\nSaya adalah asisten virtual yang siap membantu Anda.\n\nKetik *menu* untuk melihat daftar layanan yang tersedia.', '[]'),
('menu', 'navigation', '📋 *MENU LAYANAN KP2A CIMAHI*\n\nSilakan pilih layanan yang Anda butuhkan:\n\n1️⃣ *info* - Informasi umum KP2A\n2️⃣ *simpanan* - Cek saldo simpanan\n3️⃣ *pinjaman* - Cek status pinjaman\n4️⃣ *profil* - Lihat profil anggota\n5️⃣ *daftar* - Daftar sebagai anggota baru\n6️⃣ *kontak* - Informasi kontak\n\nKetik salah satu kata kunci di atas untuk menggunakan layanan.', '[]'),
('error', 'system', 'Maaf, terjadi kesalahan dalam memproses permintaan Anda. 😔\n\nSilakan coba lagi dalam beberapa saat atau hubungi admin jika masalah berlanjut.', '[]'),
('financial_info', 'financial', '💰 *INFORMASI KEUANGAN*\n\nNama: {{member_name}}\nNo. Anggota: {{member_number}}\n\n📊 *Simpanan:*\n• Simpanan Pokok: {{simpanan_pokok}}\n• Simpanan Wajib: {{simpanan_wajib}}\n• Simpanan Sukarela: {{simpanan_sukarela}}\n• Total Simpanan: {{total_simpanan}}\n\n💳 *Pinjaman:*\n• Status: {{loan_status}}\n• Sisa Pinjaman: {{remaining_loan}}\n• Angsuran Bulanan: {{monthly_payment}}', '["member_name", "member_number", "simpanan_pokok", "simpanan_wajib", "simpanan_sukarela", "total_simpanan", "loan_status", "remaining_loan", "monthly_payment"]'),
('member_profile', 'profile', '👤 *PROFIL ANGGOTA*\n\nNama: {{member_name}}\nNo. Anggota: {{member_number}}\nNo. HP: {{phone_number}}\nAlamat: {{address}}\nTanggal Bergabung: {{join_date}}\nStatus: {{status}}', '["member_name", "member_number", "phone_number", "address", "join_date", "status"]'),
('contact_info', 'contact', '📞 *KONTAK KP2A CIMAHI*\n\n🏢 Alamat:\nJl. Contoh No. 123\nCimahi, Jawa Barat\n\n📱 Telepon: (022) 1234-5678\n📧 Email: info@kp2acimahi.com\n🌐 Website: www.kp2acimahi.com\n\n⏰ Jam Operasional:\nSenin - Jumat: 08:00 - 17:00\nSabtu: 08:00 - 12:00', '[]'),
('registration_info', 'registration', '📝 *PENDAFTARAN ANGGOTA BARU*\n\nUntuk mendaftar sebagai anggota KP2A Cimahi, silakan:\n\n1️⃣ Datang langsung ke kantor kami\n2️⃣ Bawa dokumen yang diperlukan:\n   • KTP asli dan fotokopi\n   • Kartu Keluarga\n   • Pas foto 3x4 (2 lembar)\n\n3️⃣ Siapkan simpanan awal:\n   • Simpanan Pokok: Rp 100.000\n   • Simpanan Wajib: Rp 50.000\n\n📞 Info lebih lanjut: (022) 1234-5678', '[]')
ON CONFLICT (name) DO NOTHING;

-- Create utility functions for phone number normalization and currency formatting
CREATE OR REPLACE FUNCTION normalize_indonesian_phone(phone_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters
    phone_text := regexp_replace(phone_text, '[^0-9]', '', 'g');
    
    -- Handle different Indonesian phone number formats
    IF phone_text ~ '^62' THEN
        -- Already in international format (62xxx)
        RETURN phone_text;
    ELSIF phone_text ~ '^0' THEN
        -- Local format (08xxx) -> convert to international (628xxx)
        RETURN '62' || substring(phone_text from 2);
    ELSIF phone_text ~ '^8' THEN
        -- Missing leading zero (8xxx) -> convert to international (628xxx)
        RETURN '62' || phone_text;
    ELSE
        -- Return as is if format is unclear
        RETURN phone_text;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION format_rupiah(amount NUMERIC)
RETURNS TEXT AS $$
BEGIN
    RETURN 'Rp ' || to_char(amount, 'FM999,999,999,999');
END;
$$ LANGUAGE plpgsql;

-- Create function to log analytics events
CREATE OR REPLACE FUNCTION log_whatsapp_analytics(
    p_event_type TEXT,
    p_phone_number TEXT DEFAULT NULL,
    p_command TEXT DEFAULT NULL,
    p_member_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO whatsapp_analytics (
        event_type,
        phone_number,
        command,
        member_id,
        session_id,
        metadata
    ) VALUES (
        p_event_type,
        p_phone_number,
        p_command,
        p_member_id,
        p_session_id,
        p_metadata
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql;