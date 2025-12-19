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

-- Create indexes for better performance
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dues_updated_at BEFORE UPDATE ON public.dues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();