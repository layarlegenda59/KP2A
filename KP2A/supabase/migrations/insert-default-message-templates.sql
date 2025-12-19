-- Insert default message templates for WhatsApp Bot
-- This file contains the default message templates for the KP2A Cimahi WhatsApp Bot

-- Welcome message template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'welcome_message',
    'Selamat datang di KP2A Cimahi! 👋

Saya adalah bot WhatsApp KP2A yang siap membantu Anda.

Silakan pilih menu berikut:
1️⃣ Cek Saldo Simpanan
2️⃣ Info Pinjaman
3️⃣ Riwayat Transaksi
4️⃣ Bantuan

Ketik angka pilihan Anda atau ketik "menu" untuk melihat pilihan ini lagi.',
    '[]',
    'welcome',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Menu message template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'main_menu',
    'Menu KP2A Cimahi:

1️⃣ Cek Saldo Simpanan
2️⃣ Info Pinjaman
3️⃣ Riwayat Transaksi
4️⃣ Bantuan

Ketik angka pilihan Anda.',
    '[]',
    'menu',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Balance inquiry template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'balance_info',
    'Informasi Saldo Simpanan Anda:

💰 Saldo Simpanan Pokok: Rp {{pokok_balance}}
💰 Saldo Simpanan Wajib: Rp {{wajib_balance}}
💰 Saldo Simpanan Sukarela: Rp {{sukarela_balance}}

Total Simpanan: Rp {{total_balance}}

Terakhir diperbarui: {{last_updated}}

Ketik "menu" untuk kembali ke menu utama.',
    '["pokok_balance", "wajib_balance", "sukarela_balance", "total_balance", "last_updated"]',
    'balance',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Loan information template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'loan_info',
    'Informasi Pinjaman Anda:

📋 Status Pinjaman: {{loan_status}}
💵 Jumlah Pinjaman: Rp {{loan_amount}}
💰 Sisa Pinjaman: Rp {{remaining_amount}}
📅 Jatuh Tempo: {{due_date}}
💳 Angsuran Bulanan: Rp {{monthly_payment}}

{{payment_status}}

Ketik "menu" untuk kembali ke menu utama.',
    '["loan_status", "loan_amount", "remaining_amount", "due_date", "monthly_payment", "payment_status"]',
    'loan',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Transaction history template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'transaction_history',
    'Riwayat Transaksi Terakhir:

{{transaction_list}}

Untuk melihat riwayat lengkap, silakan kunjungi kantor KP2A atau hubungi admin.

Ketik "menu" untuk kembali ke menu utama.',
    '["transaction_list"]',
    'balance',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Help message template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'help_info',
    'Bantuan KP2A Cimahi Bot:

🤖 Cara menggunakan bot:
• Ketik angka 1-4 untuk memilih menu
• Ketik "menu" untuk melihat pilihan menu
• Ketik "bantuan" atau "help" untuk melihat pesan ini

📞 Kontak KP2A Cimahi:
• Telepon: (022) 6652345
• WhatsApp Admin: 0812-3456-7890
• Alamat: Jl. Raya Cimahi No. 123

🕒 Jam Operasional:
Senin - Jumat: 08:00 - 16:00
Sabtu: 08:00 - 12:00

Ketik "menu" untuk kembali ke menu utama.',
    '[]',
    'help',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Error message template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'error_general',
    'Maaf, terjadi kesalahan dalam memproses permintaan Anda. 😔

Silakan coba lagi dalam beberapa saat atau hubungi admin KP2A jika masalah berlanjut.

Ketik "menu" untuk kembali ke menu utama.',
    '[]',
    'error',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Member not found template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'member_not_found',
    'Nomor WhatsApp Anda belum terdaftar dalam sistem KP2A Cimahi. 📱

Untuk menggunakan layanan bot ini, silakan:
1. Hubungi admin KP2A untuk mendaftarkan nomor WhatsApp Anda
2. Atau kunjungi kantor KP2A Cimahi

📞 Kontak Admin: 0812-3456-7890
📍 Alamat: Jl. Raya Cimahi No. 123',
    '[]',
    'error',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Invalid input template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'invalid_input',
    'Maaf, saya tidak mengerti pesan Anda. 🤔

Silakan pilih salah satu opsi berikut:
1️⃣ Cek Saldo Simpanan
2️⃣ Info Pinjaman
3️⃣ Riwayat Transaksi
4️⃣ Bantuan

Atau ketik "menu" untuk melihat pilihan menu.',
    '[]',
    'error',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Verification request template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'verification_request',
    'Untuk keamanan, silakan verifikasi identitas Anda dengan mengirimkan:

📝 Nama lengkap sesuai KTP
🆔 Nomor anggota KP2A

Contoh:
Nama: John Doe
Nomor Anggota: 12345

Data Anda akan diverifikasi dengan database KP2A.',
    '[]',
    'help',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Verification success template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'verification_success',
    'Verifikasi berhasil! ✅

Selamat datang {{member_name}}, nomor anggota {{member_number}}.

Anda sekarang dapat menggunakan semua fitur bot KP2A Cimahi.

Ketik "menu" untuk melihat pilihan yang tersedia.',
    '["member_name", "member_number"]',
    'welcome',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Verification failed template
INSERT INTO message_templates (id, name, content, variables, category, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'verification_failed',
    'Verifikasi gagal! ❌

Data yang Anda berikan tidak cocok dengan database KP2A.

Silakan periksa kembali:
• Nama lengkap sesuai KTP
• Nomor anggota KP2A

Atau hubungi admin KP2A untuk bantuan: 0812-3456-7890',
    '[]',
    'error',
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();