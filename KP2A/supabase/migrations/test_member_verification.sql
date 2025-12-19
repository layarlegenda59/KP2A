-- Insert test member data for WhatsApp Bot testing
INSERT INTO members (
    nama_lengkap,
    nik,
    alamat,
    no_hp,
    status_keanggotaan,
    tanggal_masuk,
    jabatan,
    id_anggota
) VALUES (
    'Test User Bot',
    '1234567890123456',
    'Jl. Test No. 123, Cimahi',
    '083140539825',
    'aktif',
    '2024-01-01',
    'Anggota',
    'TEST001'
) ON CONFLICT (id_anggota) DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    no_hp = EXCLUDED.no_hp,
    status_keanggotaan = EXCLUDED.status_keanggotaan;

-- Insert WhatsApp verification for test member
INSERT INTO whatsapp_verifications (
    member_id,
    phone_number,
    is_verified,
    verified_at
) VALUES (
    (SELECT id FROM members WHERE id_anggota = 'TEST001'),
    '083140539825',
    true,
    NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
    is_verified = EXCLUDED.is_verified,
    verified_at = EXCLUDED.verified_at;

-- Insert test savings data
INSERT INTO savings (
    member_id,
    type,
    amount,
    created_at
) VALUES 
(
    (SELECT id FROM members WHERE id_anggota = 'TEST001'),
    'Simpanan Pokok',
    500000,
    NOW()
),
(
    (SELECT id FROM members WHERE id_anggota = 'TEST001'),
    'Simpanan Wajib',
    1200000,
    NOW()
) ON CONFLICT DO NOTHING;

-- Insert test loan data
INSERT INTO loans (
    member_id,
    jumlah_pinjaman,
    bunga_persen,
    tenor_bulan,
    angsuran_bulanan,
    tanggal_pinjaman,
    status,
    sisa_pinjaman,
    sudah_bayar_angsuran,
    created_at
) VALUES (
    (SELECT id FROM members WHERE id_anggota = 'TEST001'),
    5000000,
    12.0,
    24,
    250000,
    '2024-01-01',
    'aktif',
    3500000,
    7,
    NOW()
) ON CONFLICT DO NOTHING;

-- Test data successfully inserted for WhatsApp Bot testing
-- Member: TEST001 (083140539825)
-- Savings: Simpanan Pokok (500,000) + Simpanan Wajib (1,200,000)
-- Loan: 5,000,000 with 3,500,000 remaining