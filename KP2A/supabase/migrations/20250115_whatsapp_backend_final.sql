-- WhatsApp Backend Integration - Final Migration
-- This migration creates the necessary tables and functions for WhatsApp bot integration

-- Create whatsapp_command_logs table for individual command tracking
CREATE TABLE IF NOT EXISTS whatsapp_command_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    command_type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    request_content TEXT,
    response_content TEXT,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to whatsapp_messages if they don't exist
DO $$ 
BEGIN
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN session_id VARCHAR(255);
    END IF;

    -- Add processed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_messages' 
                   AND column_name = 'processed') THEN
        ALTER TABLE whatsapp_messages ADD COLUMN processed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add missing columns to whatsapp_config if they don't exist
DO $$ 
BEGIN
    -- Add max_retry_attempts column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_config' 
                   AND column_name = 'max_retry_attempts') THEN
        ALTER TABLE whatsapp_config ADD COLUMN max_retry_attempts INTEGER DEFAULT 3;
    END IF;

    -- Add session_timeout_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'whatsapp_config' 
                   AND column_name = 'session_timeout_minutes') THEN
        ALTER TABLE whatsapp_config ADD COLUMN session_timeout_minutes INTEGER DEFAULT 30;
    END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
DO $$ 
BEGIN
    -- Index for whatsapp_command_logs
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_command_logs_member_id') THEN
        CREATE INDEX idx_whatsapp_command_logs_member_id ON whatsapp_command_logs(member_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_command_logs_created_at') THEN
        CREATE INDEX idx_whatsapp_command_logs_created_at ON whatsapp_command_logs(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_command_logs_command_type') THEN
        CREATE INDEX idx_whatsapp_command_logs_command_type ON whatsapp_command_logs(command_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_command_logs_phone_number') THEN
        CREATE INDEX idx_whatsapp_command_logs_phone_number ON whatsapp_command_logs(phone_number);
    END IF;

    -- Index for whatsapp_messages
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_messages_processed') THEN
        CREATE INDEX idx_whatsapp_messages_processed ON whatsapp_messages(processed);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_whatsapp_messages_session_id') THEN
        CREATE INDEX idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
    END IF;

    -- Index for members table (for phone number lookup)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_no_hp_normalized') THEN
        CREATE INDEX idx_members_no_hp_normalized ON members(no_hp);
    END IF;
END $$;

-- Create or update functions for phone number normalization
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters
    phone_input := regexp_replace(phone_input, '[^0-9]', '', 'g');
    
    -- Handle Indonesian phone number formats
    IF phone_input ~ '^62' THEN
        -- Already in international format (62xxx)
        RETURN phone_input;
    ELSIF phone_input ~ '^0' THEN
        -- Local format (08xxx) -> convert to international (628xxx)
        RETURN '62' || substring(phone_input from 2);
    ELSIF phone_input ~ '^8' THEN
        -- Missing leading zero (8xxx) -> convert to international (628xxx)
        RETURN '62' || phone_input;
    ELSE
        -- Return as is for other formats
        RETURN phone_input;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create or update function for Rupiah formatting
CREATE OR REPLACE FUNCTION format_rupiah(amount NUMERIC)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL THEN
        RETURN 'Rp 0';
    END IF;
    
    RETURN 'Rp ' || to_char(amount, 'FM999,999,999,999');
END;
$$ LANGUAGE plpgsql;

-- Create or update function for command logging
CREATE OR REPLACE FUNCTION log_whatsapp_command(
    p_member_id UUID,
    p_command_type VARCHAR(50),
    p_phone_number VARCHAR(20),
    p_request_content TEXT DEFAULT NULL,
    p_response_content TEXT DEFAULT NULL,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO whatsapp_command_logs (
        member_id,
        command_type,
        phone_number,
        request_content,
        response_content,
        response_time_ms,
        success,
        error_message,
        created_at
    ) VALUES (
        p_member_id,
        p_command_type,
        p_phone_number,
        p_request_content,
        p_response_content,
        p_response_time_ms,
        p_success,
        p_error_message,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Ensure RLS policies exist and are properly configured
DO $$ 
BEGIN
    -- Enable RLS on WhatsApp tables
    ALTER TABLE whatsapp_command_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist to recreate them
    DROP POLICY IF EXISTS "whatsapp_command_logs_all_access" ON whatsapp_command_logs;
    DROP POLICY IF EXISTS "whatsapp_messages_all_access" ON whatsapp_messages;
    DROP POLICY IF EXISTS "message_templates_all_access" ON message_templates;
    DROP POLICY IF EXISTS "whatsapp_config_all_access" ON whatsapp_config;
    
    -- Create comprehensive RLS policies
    CREATE POLICY "whatsapp_command_logs_all_access" ON whatsapp_command_logs FOR ALL USING (true);
    CREATE POLICY "whatsapp_messages_all_access" ON whatsapp_messages FOR ALL USING (true);
    CREATE POLICY "message_templates_all_access" ON message_templates FOR ALL USING (true);
    CREATE POLICY "whatsapp_config_all_access" ON whatsapp_config FOR ALL USING (true);
END $$;

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON whatsapp_command_logs TO anon;
GRANT SELECT ON whatsapp_messages TO anon;
GRANT SELECT ON message_templates TO anon;
GRANT SELECT ON whatsapp_config TO anon;

GRANT ALL PRIVILEGES ON whatsapp_command_logs TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_messages TO authenticated;
GRANT ALL PRIVILEGES ON message_templates TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_config TO authenticated;

-- Update existing whatsapp_config if it exists, otherwise insert default
DO $$
DECLARE
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO config_count FROM whatsapp_config;
    
    IF config_count = 0 THEN
        -- Insert default configuration if no config exists
        INSERT INTO whatsapp_config (status, phone_number, welcome_message, auto_reply, max_retry_attempts, session_timeout_minutes) 
        VALUES (
            'inactive',
            '628123456789',
            'Selamat datang di KP2A Cimahi! 👋

Ketik "menu" untuk melihat layanan yang tersedia.',
            true,
            3,
            30
        );
    ELSE
        -- Update existing config with new columns
        UPDATE whatsapp_config SET
            max_retry_attempts = COALESCE(max_retry_attempts, 3),
            session_timeout_minutes = COALESCE(session_timeout_minutes, 30),
            updated_at = NOW()
        WHERE max_retry_attempts IS NULL OR session_timeout_minutes IS NULL;
    END IF;
END $$;

-- Insert or update default message templates using allowed categories
INSERT INTO message_templates (name, content, variables, category) VALUES
('welcome_new', 'Halo {{nama}}! 👋

Selamat datang di layanan WhatsApp KP2A Cimahi.

Ketik "menu" untuk melihat layanan yang tersedia.', '["nama"]', 'welcome'),

('main_menu', '📋 *MENU LAYANAN KP2A CIMAHI*
━━━━━━━━━━━━━━━

1️⃣ *simpanan* - Cek saldo simpanan
2️⃣ *pinjaman* - Info pinjaman aktif  
3️⃣ *profil* - Data keanggotaan
4️⃣ *kontak* - Hubungi pengurus
5️⃣ *daftar* - Info pendaftaran

━━━━━━━━━━━━━━━
💡 Ketik salah satu menu di atas', '[]', 'menu'),

('not_registered', '❌ Maaf, nomor Anda belum terdaftar sebagai anggota KP2A Cimahi.

📞 *Untuk informasi pendaftaran:*
• Hubungi admin di nomor yang tersedia

💡 Ketik "daftar" untuk info pendaftaran', '[]', 'error'),

('error_general', '⚠️ Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.

Ketik "menu" untuk kembali ke menu utama.', '[]', 'error'),

('simpanan_info', '💰 *INFORMASI SIMPANAN*
━━━━━━━━━━━━━━━

👤 *{{nama_lengkap}}* ({{id_anggota}})

📊 *Detail Simpanan:*
• Simpanan Pokok: {{simpanan_pokok}}
• Simpanan Wajib: {{simpanan_wajib}}  
• Simpanan Sukarela: {{simpanan_sukarela}}

💵 *Total Simpanan: {{total_simpanan}}*

━━━━━━━━━━━━━━━
📅 Data per: {{tanggal_update}}', '["nama_lengkap", "id_anggota", "simpanan_pokok", "simpanan_wajib", "simpanan_sukarela", "total_simpanan", "tanggal_update"]', 'balance'),

('pinjaman_info', '🧾 *INFORMASI PINJAMAN*
━━━━━━━━━━━━━━━

👤 *{{nama_lengkap}}* ({{id_anggota}})

💳 *Detail Pinjaman:*
• Jumlah Pinjaman: {{jumlah_pinjaman}}
• Bunga: {{bunga_persen}}%
• Tenor: {{tenor_bulan}} bulan
• Angsuran Bulanan: {{angsuran_bulanan}}

💰 *Sisa Pinjaman: {{sisa_pinjaman}}*
✅ *Sudah Bayar: {{sudah_bayar_angsuran}} kali*

━━━━━━━━━━━━━━━
📅 Data per: {{tanggal_update}}', '["nama_lengkap", "id_anggota", "jumlah_pinjaman", "bunga_persen", "tenor_bulan", "angsuran_bulanan", "sisa_pinjaman", "sudah_bayar_angsuran", "tanggal_update"]', 'loan'),

('no_pinjaman', '🧾 *INFORMASI PINJAMAN*
━━━━━━━━━━━━━━━

👤 *{{nama_lengkap}}* ({{id_anggota}})

✅ Anda saat ini tidak memiliki pinjaman aktif.

💡 Untuk informasi pengajuan pinjaman, hubungi pengurus melalui menu "kontak".', '["nama_lengkap", "id_anggota"]', 'loan'),

('profil_info', '👤 *PROFIL ANGGOTA*
━━━━━━━━━━━━━━━

📋 *Data Pribadi:*
• Nama: {{nama_lengkap}}
• ID Anggota: {{id_anggota}}
• No. HP: {{no_hp}}
• Status: {{status_keanggotaan}}
• Bergabung: {{tanggal_masuk}}

💰 *Ringkasan Keuangan:*
• Total Simpanan: {{total_simpanan}}
• Total Pinjaman: {{total_pinjaman}}

━━━━━━━━━━━━━━━
📅 Data per: {{tanggal_update}}', '["nama_lengkap", "id_anggota", "no_hp", "status_keanggotaan", "tanggal_masuk", "total_simpanan", "total_pinjaman", "tanggal_update"]', 'help'),

('kontak_info', '📞 *KONTAK PENGURUS KP2A CIMAHI*
━━━━━━━━━━━━━━━

👥 *Pengurus yang dapat dihubungi:*

🏢 *Kantor KP2A Cimahi*
📍 Alamat: [Alamat Kantor]
📞 Telepon: [Nomor Telepon]

👨‍💼 *Ketua Koperasi*
📱 WhatsApp: [Nomor WhatsApp]

👩‍💼 *Bendahara*
📱 WhatsApp: [Nomor WhatsApp]

⏰ *Jam Operasional:*
Senin - Jumat: 08:00 - 16:00
Sabtu: 08:00 - 12:00

━━━━━━━━━━━━━━━
💡 Silakan hubungi sesuai keperluan Anda', '[]', 'help'),

('daftar_info', '📝 *INFORMASI PENDAFTARAN ANGGOTA*
━━━━━━━━━━━━━━━

✅ *Syarat Pendaftaran:*
• Fotokopi KTP
• Pas foto 3x4 (2 lembar)
• Mengisi formulir pendaftaran
• Setoran simpanan pokok
• Setoran simpanan wajib pertama

💰 *Biaya Pendaftaran:*
• Simpanan Pokok: Rp 100,000
• Simpanan Wajib: Rp 25,000/bulan

📞 *Untuk mendaftar, hubungi:*
• Kantor KP2A Cimahi
• Atau pengurus melalui menu "kontak"

━━━━━━━━━━━━━━━
💡 Selamat bergabung dengan KP2A Cimahi!', '[]', 'help')

ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
    DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
    
    -- Create new triggers
    CREATE TRIGGER update_whatsapp_config_updated_at
        BEFORE UPDATE ON whatsapp_config
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_message_templates_updated_at
        BEFORE UPDATE ON message_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;