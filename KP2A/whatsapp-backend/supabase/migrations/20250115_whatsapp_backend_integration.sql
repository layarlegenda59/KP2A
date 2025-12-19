-- WhatsApp Backend Integration - Complete Database Schema
-- This migration creates all necessary tables for the WhatsApp Backend Integration
-- Following the Technical Architecture specifications

-- ============================================================================
-- 1. WHATSAPP ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    command_type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    request_content TEXT,
    response_content TEXT,
    response_time_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ENHANCED MESSAGE TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. ENHANCED WHATSAPP CONFIG TABLE
-- ============================================================================
-- Add missing columns to existing whatsapp_config table
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}',
ADD COLUMN IF NOT EXISTS admin_contacts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 10;

-- ============================================================================
-- 4. ENHANCED WHATSAPP MESSAGES TABLE
-- ============================================================================
-- Add additional columns for better message tracking
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS is_command BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS member_validated BOOLEAN DEFAULT false;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- WhatsApp Analytics indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_member_id ON whatsapp_analytics(member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_created_at ON whatsapp_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_command_type ON whatsapp_analytics(command_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_phone_number ON whatsapp_analytics(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_success ON whatsapp_analytics(success);

-- Message Templates indexes
CREATE INDEX IF NOT EXISTS idx_message_templates_name ON message_templates(name);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- Enhanced WhatsApp Messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_is_command ON whatsapp_messages(is_command);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_member_validated ON whatsapp_messages(member_validated);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_response_time ON whatsapp_messages(response_time_ms);

-- Members table phone number index (if not exists)
CREATE INDEX IF NOT EXISTS idx_members_no_hp ON members(no_hp);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- WhatsApp Analytics policies
DROP POLICY IF EXISTS "whatsapp_analytics_all_access" ON whatsapp_analytics;
CREATE POLICY "whatsapp_analytics_all_access" ON whatsapp_analytics FOR ALL USING (true);

-- Message Templates policies
DROP POLICY IF EXISTS "message_templates_all_access" ON message_templates;
CREATE POLICY "message_templates_all_access" ON message_templates FOR ALL USING (true);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for WhatsApp Analytics
GRANT SELECT ON whatsapp_analytics TO anon;
GRANT ALL PRIVILEGES ON whatsapp_analytics TO authenticated;

-- Grant permissions for Message Templates
GRANT SELECT ON message_templates TO anon;
GRANT ALL PRIVILEGES ON message_templates TO authenticated;

-- ============================================================================
-- 9. CREATE TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for message_templates
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at 
    BEFORE UPDATE ON message_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. INSERT DEFAULT DATA
-- ============================================================================

-- Insert default WhatsApp configuration
INSERT INTO whatsapp_config (
    status, 
    welcome_message, 
    auto_reply, 
    max_retry_attempts, 
    session_timeout_minutes,
    business_hours,
    admin_contacts,
    rate_limit_per_minute
) VALUES (
    'disconnected',
    'Selamat datang di KP2A Cimahi! 👋

Ketik "menu" untuk melihat layanan yang tersedia.',
    true,
    3,
    30,
    '{"start": "08:00", "end": "17:00", "timezone": "Asia/Jakarta"}',
    '[{"name": "Admin KP2A", "phone": "081234567890", "role": "Administrator"}]',
    10
) ON CONFLICT DO NOTHING;

-- Insert default message templates
INSERT INTO message_templates (name, content, variables, category, description) VALUES
(
    'welcome',
    'Halo {{nama}}! 👋

Selamat datang di layanan WhatsApp KP2A Cimahi.

Ketik "menu" untuk melihat layanan yang tersedia.',
    '["nama"]',
    'greeting',
    'Welcome message for registered members'
),
(
    'menu',
    '📋 *MENU LAYANAN KP2A CIMAHI*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ *Simpanan* - Cek saldo simpanan
2️⃣ *Pinjaman* - Info pinjaman aktif  
3️⃣ *Profil* - Data keanggotaan
4️⃣ *Kontak* - Hubungi pengurus
5️⃣ *Daftar* - Info pendaftaran

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Ketik salah satu menu di atas',
    '[]',
    'navigation',
    'Main menu for bot navigation'
),
(
    'not_registered',
    '❌ Maaf, nomor Anda belum terdaftar sebagai anggota KP2A Cimahi.

📞 *Untuk informasi pendaftaran:*
• Hubungi admin di nomor yang tersedia

💡 Ketik "daftar" untuk info pendaftaran',
    '[]',
    'error',
    'Message for unregistered phone numbers'
),
(
    'error_general',
    '⚠️ Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.

Ketik "menu" untuk kembali ke menu utama.',
    '[]',
    'error',
    'General error message'
),
(
    'simpanan_info',
    '💰 *INFORMASI SIMPANAN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *Nama:* {{nama}}
🆔 *ID Anggota:* {{id_anggota}}

💵 *Simpanan Pokok:* {{simpanan_pokok}}
💵 *Simpanan Wajib:* {{simpanan_wajib}}
💵 *Simpanan Sukarela:* {{simpanan_sukarela}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *TOTAL SIMPANAN:* {{total_simpanan}}

📅 *Periode:* {{periode}}
🕐 *Update:* {{tanggal_update}}',
    '["nama", "id_anggota", "simpanan_pokok", "simpanan_wajib", "simpanan_sukarela", "total_simpanan", "periode", "tanggal_update"]',
    'financial',
    'Savings information template'
),
(
    'pinjaman_info',
    '🧾 *INFORMASI PINJAMAN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *Nama:* {{nama}}
🆔 *ID Anggota:* {{id_anggota}}

💰 *Jumlah Pinjaman:* {{jumlah_pinjaman}}
📈 *Bunga:* {{bunga_persen}}%
📅 *Tenor:* {{tenor_bulan}} bulan
💳 *Angsuran/Bulan:* {{angsuran_bulanan}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 *SISA PINJAMAN:* {{sisa_pinjaman}}
✅ *Sudah Bayar:* {{sudah_bayar_angsuran}} kali

📅 *Tanggal Pinjaman:* {{tanggal_pinjaman}}
📊 *Status:* {{status}}',
    '["nama", "id_anggota", "jumlah_pinjaman", "bunga_persen", "tenor_bulan", "angsuran_bulanan", "sisa_pinjaman", "sudah_bayar_angsuran", "tanggal_pinjaman", "status"]',
    'financial',
    'Loan information template'
),
(
    'no_pinjaman',
    '✅ *INFORMASI PINJAMAN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *Nama:* {{nama}}
🆔 *ID Anggota:* {{id_anggota}}

📋 Anda saat ini tidak memiliki pinjaman aktif.

💡 Untuk informasi pengajuan pinjaman, hubungi pengurus melalui menu "kontak".',
    '["nama", "id_anggota"]',
    'financial',
    'No active loan message'
),
(
    'profil_anggota',
    '👤 *PROFIL ANGGOTA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 *ID Anggota:* {{id_anggota}}
👤 *Nama Lengkap:* {{nama_lengkap}}
🆔 *NIK:* {{nik}}
📱 *No. HP:* {{no_hp}}
🚻 *Jenis Kelamin:* {{jenis_kelamin}}
📍 *Alamat:* {{alamat}}
💼 *Jabatan:* {{jabatan}}
📅 *Tanggal Masuk:* {{tanggal_masuk}}
📊 *Status:* {{status_keanggotaan}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Total Simpanan:* {{total_simpanan}}
🧾 *Total Pinjaman:* {{total_pinjaman}}',
    '["id_anggota", "nama_lengkap", "nik", "no_hp", "jenis_kelamin", "alamat", "jabatan", "tanggal_masuk", "status_keanggotaan", "total_simpanan", "total_pinjaman"]',
    'profile',
    'Member profile information template'
),
(
    'kontak_admin',
    '📞 *KONTAK PENGURUS KP2A CIMAHI*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💼 *Ketua:* 
📱 081234567890

👩‍💼 *Sekretaris:*
📱 081234567891

👨‍💼 *Bendahara:*
📱 081234567892

🏢 *Kantor:*
📱 (022) 1234567
📍 Jl. Contoh No. 123, Cimahi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 *Jam Operasional:*
Senin - Jumat: 08:00 - 17:00 WIB
Sabtu: 08:00 - 12:00 WIB

💡 Silakan hubungi pengurus untuk informasi lebih lanjut.',
    '[]',
    'contact',
    'Contact information for KP2A administrators'
),
(
    'info_pendaftaran',
    '📝 *INFORMASI PENDAFTARAN ANGGOTA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *Persyaratan:*
• KTP yang masih berlaku
• Foto 3x4 (2 lembar)
• Simpanan pokok Rp 100.000
• Simpanan wajib Rp 25.000/bulan

💰 *Keuntungan Menjadi Anggota:*
• Simpanan dengan bagi hasil
• Pinjaman dengan bunga rendah
• Layanan keuangan 24/7
• Konsultasi keuangan gratis

📞 *Hubungi Pengurus:*
Ketik "kontak" untuk info lengkap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Datang langsung ke kantor untuk pendaftaran.',
    '[]',
    'registration',
    'Registration information for new members'
)
ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 11. CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Function to normalize Indonesian phone numbers
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters
    phone_input := regexp_replace(phone_input, '[^0-9]', '', 'g');
    
    -- Handle different Indonesian phone number formats
    IF phone_input ~ '^62' THEN
        -- Already in international format (62xxx)
        RETURN phone_input;
    ELSIF phone_input ~ '^0' THEN
        -- Local format (08xxx) -> convert to international (628xxx)
        RETURN '62' || substring(phone_input from 2);
    ELSIF phone_input ~ '^8' THEN
        -- Without leading 0 (8xxx) -> convert to international (628xxx)
        RETURN '62' || phone_input;
    ELSE
        -- Return as is if format is unclear
        RETURN phone_input;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to format currency in Indonesian Rupiah
CREATE OR REPLACE FUNCTION format_rupiah(amount DECIMAL)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL THEN
        RETURN 'Rp 0';
    END IF;
    
    RETURN 'Rp ' || to_char(amount, 'FM999,999,999,999');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO whatsapp_analytics (
    command_type,
    phone_number,
    request_content,
    response_content,
    success,
    created_at
) VALUES (
    'system',
    'migration',
    'WhatsApp Backend Integration Migration',
    'Database schema created successfully with all tables, indexes, and policies',
    true,
    NOW()
);