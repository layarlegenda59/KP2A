-- KP2A Cimahi Database Setup Script
-- Run this script in your Supabase SQL Editor to create all required tables and policies

-- =============================================
-- PART 1: CREATE TABLES AND BASIC STRUCTURE
-- =============================================

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_anggota TEXT UNIQUE,
    nama_lengkap TEXT NOT NULL,
    nik TEXT NOT NULL,
    alamat TEXT NOT NULL,
    no_hp TEXT NOT NULL,
    status_keanggotaan TEXT CHECK (status_keanggotaan IN ('aktif', 'non_aktif', 'pending')) DEFAULT 'pending',
    tanggal_masuk DATE NOT NULL,
    jabatan TEXT NOT NULL DEFAULT 'Anggota',
    foto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dues table
CREATE TABLE IF NOT EXISTS public.dues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    tahun INTEGER NOT NULL,
    iuran_wajib DECIMAL(15,2) NOT NULL DEFAULT 0,
    iuran_sukarela DECIMAL(15,2) NOT NULL DEFAULT 0,
    tanggal_bayar DATE NOT NULL,
    status TEXT CHECK (status IN ('lunas', 'belum_lunas')) DEFAULT 'belum_lunas',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, bulan, tahun)
);

-- Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    jumlah_pinjaman DECIMAL(15,2) NOT NULL,
    bunga_persen DECIMAL(5,2) NOT NULL,
    tenor_bulan INTEGER NOT NULL,
    angsuran_bulanan DECIMAL(15,2) NOT NULL,
    tanggal_pinjaman DATE NOT NULL,
    status TEXT CHECK (status IN ('aktif', 'lunas', 'pending', 'ditolak')) DEFAULT 'pending',
    sisa_pinjaman DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    angsuran_ke INTEGER NOT NULL,
    angsuran_pokok DECIMAL(15,2) NOT NULL,
    angsuran_bunga DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_angsuran DECIMAL(15,2) NOT NULL,
    tanggal_bayar DATE NOT NULL,
    status TEXT CHECK (status IN ('lunas', 'terlambat')) DEFAULT 'lunas',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(loan_id, angsuran_ke)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kategori TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL,
    bukti_pengeluaran TEXT,
    status_otorisasi TEXT CHECK (status_otorisasi IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_by UUID NOT NULL,
    authorized_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'pengurus', 'anggota')) DEFAULT 'anggota',
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp bot configuration tables
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
    welcome_message TEXT NOT NULL DEFAULT 'Selamat datang di KP2A Cimahi!',
    phone_number TEXT,
    auto_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_members_id_anggota ON public.members(id_anggota);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status_keanggotaan);
CREATE INDEX IF NOT EXISTS idx_dues_member_id ON public.dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_bulan_tahun ON public.dues(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_loans_member_id ON public.loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON public.expenses(tanggal);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_member_id ON public.users(member_id);

-- =============================================
-- PART 3: CREATE TRIGGERS AND FUNCTIONS
-- =============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dues_updated_at ON public.dues;
CREATE TRIGGER update_dues_updated_at BEFORE UPDATE ON public.dues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON public.whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_reports_updated_at ON public.financial_reports;
CREATE TRIGGER update_financial_reports_updated_at BEFORE UPDATE ON public.financial_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PART 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 5: CREATE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON public.members;

-- Create RLS policies for members table
CREATE POLICY "Allow authenticated users to view members" ON public.members
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert members" ON public.members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update members" ON public.members
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete members" ON public.members
    FOR DELETE USING (true);

-- Create RLS policies for other tables (similar pattern)
DROP POLICY IF EXISTS "Allow authenticated users to manage dues" ON public.dues;
CREATE POLICY "Allow authenticated users to manage dues" ON public.dues
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage loans" ON public.loans;
CREATE POLICY "Allow authenticated users to manage loans" ON public.loans
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage loan_payments" ON public.loan_payments;
CREATE POLICY "Allow authenticated users to manage loan_payments" ON public.loan_payments
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage expenses" ON public.expenses;
CREATE POLICY "Allow authenticated users to manage expenses" ON public.expenses
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage users" ON public.users;
CREATE POLICY "Allow authenticated users to manage users" ON public.users
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Allow authenticated users to manage whatsapp_templates" ON public.whatsapp_templates
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage whatsapp_config" ON public.whatsapp_config;
CREATE POLICY "Allow authenticated users to manage whatsapp_config" ON public.whatsapp_config
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage financial_reports" ON public.financial_reports;
CREATE POLICY "Allow authenticated users to manage financial_reports" ON public.financial_reports
    FOR ALL USING (true);

-- =============================================
-- PART 6: GRANT PERMISSIONS
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================
-- PART 7: INSERT SAMPLE DATA
-- =============================================

-- Insert default WhatsApp configuration
INSERT INTO public.whatsapp_config (status, welcome_message, auto_reply) 
VALUES ('inactive', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.', false)
ON CONFLICT DO NOTHING;

-- Insert sample WhatsApp templates
INSERT INTO public.whatsapp_templates (name, content) VALUES 
('welcome', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.'),
('help', 'Menu yang tersedia:\n1. info - Informasi organisasi\n2. saldo - Cek saldo iuran\n3. pinjaman - Info pinjaman\n4. kontak - Hubungi admin'),
('info', 'KP2A Cimahi adalah organisasi yang melayani kebutuhan finansial anggota dengan berbagai produk simpan pinjam.'),
('kontak', 'Untuk informasi lebih lanjut, hubungi admin di nomor: 0812-3456-7890')
ON CONFLICT DO NOTHING;

-- Create financial_reports table
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    periode_start DATE NOT NULL,
    periode_end DATE NOT NULL,
    tipe_laporan TEXT CHECK (tipe_laporan IN ('bulanan', 'triwulan', 'tahunan')) NOT NULL,
    total_pemasukan DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_pengeluaran DECIMAL(15,2) NOT NULL DEFAULT 0,
    saldo_akhir DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample member data based on the CSV template
INSERT INTO public.members (id_anggota, nama_lengkap, nik, alamat, no_hp, status_keanggotaan, tanggal_masuk, jabatan) VALUES 
('001-KP2ACIMAHI', 'Ahmad Rahman', '3204123456789012', 'Jl. Merdeka No. 123, RW 05, Kelurahan Cimahi Tengah', '081234567890', 'aktif', '2023-01-15', 'Ketua'),
('002-KP2ACIMAHI', 'Siti Nurhaliza', '3204123456789013', 'Jl. Sudirman No. 45, RW 03, Kelurahan Cimahi Utara', '081234567891', 'aktif', '2023-02-10', 'Sekretaris'),
('003-KP2ACIMAHI', 'Budi Santoso', '3204123456789014', 'Jl. Ahmad Yani No. 67, RW 07, Kelurahan Cimahi Selatan', '081234567892', 'aktif', '2023-03-05', 'Bendahara'),
('004-KP2ACIMAHI', 'Dewi Sartika', '3204123456789015', 'Jl. Gatot Subroto No. 89, RW 02, Kelurahan Cimahi Tengah', '081234567893', 'aktif', '2023-04-20', 'Anggota'),
('005-KP2ACIMAHI', 'Eko Prasetyo', '3204123456789016', 'Jl. Diponegoro No. 12, RW 04, Kelurahan Cimahi Utara', '081234567894', 'aktif', '2023-05-15', 'Anggota')
ON CONFLICT (id_anggota) DO NOTHING;

-- =============================================
-- SETUP COMPLETE
-- =============================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ KP2A Cimahi database setup completed successfully!';
    RAISE NOTICE '📊 Tables created: members, dues, loans, loan_payments, expenses, financial_reports, users, whatsapp_templates, whatsapp_config';
    RAISE NOTICE '🔒 Row Level Security (RLS) enabled on all tables';
    RAISE NOTICE '👥 Sample member data inserted';
    RAISE NOTICE '💬 WhatsApp bot configuration ready';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your KP2A Cimahi application is now ready to use!';
END $$;