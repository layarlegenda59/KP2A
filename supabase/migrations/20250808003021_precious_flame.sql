/*
  # KP2A Cimahi Financial Reporting System Database Schema

  1. New Tables
    - `users` - User management with roles
    - `members` - Cooperative members data
    - `dues` - Monthly dues (mandatory & voluntary)
    - `loans` - Member loans management
    - `loan_payments` - Loan installment payments
    - `expenses` - Cooperative expenses
    - `financial_reports` - Generated financial reports

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Ensure data isolation between users

  3. Indexes
    - Add performance indexes on frequently queried columns
    - Foreign key indexes for joins
*/

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'pengurus', 'anggota')) DEFAULT 'anggota',
  member_id uuid REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lengkap text NOT NULL,
  nik text UNIQUE NOT NULL,
  alamat text NOT NULL,
  no_hp text NOT NULL,
  status_keanggotaan text NOT NULL CHECK (status_keanggotaan IN ('aktif', 'non_aktif', 'pending')) DEFAULT 'pending',
  tanggal_masuk date NOT NULL,
  jabatan text NOT NULL,
  foto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Dues table for monthly contributions
CREATE TABLE IF NOT EXISTS dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  bulan integer NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun integer NOT NULL,
  iuran_wajib decimal(12,2) NOT NULL DEFAULT 0,
  iuran_sukarela decimal(12,2) NOT NULL DEFAULT 0,
  tanggal_bayar date NOT NULL,
  status text NOT NULL CHECK (status IN ('lunas', 'belum_lunas')) DEFAULT 'belum_lunas',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, bulan, tahun)
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  jumlah_pinjaman decimal(15,2) NOT NULL,
  bunga_persen decimal(5,2) NOT NULL DEFAULT 2.0,
  tenor_bulan integer NOT NULL,
  angsuran_bulanan decimal(15,2) NOT NULL,
  tanggal_pinjaman date NOT NULL,
  status text NOT NULL CHECK (status IN ('aktif', 'lunas', 'pending', 'ditolak')) DEFAULT 'pending',
  sisa_pinjaman decimal(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Loan payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  angsuran_ke integer NOT NULL,
  angsuran_pokok decimal(15,2) NOT NULL,
  angsuran_bunga decimal(15,2) NOT NULL,
  total_angsuran decimal(15,2) NOT NULL,
  tanggal_bayar date NOT NULL,
  status text NOT NULL CHECK (status IN ('lunas', 'terlambat')) DEFAULT 'lunas',
  created_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori text NOT NULL,
  deskripsi text NOT NULL,
  jumlah decimal(15,2) NOT NULL,
  tanggal date NOT NULL,
  bukti_pengeluaran text,
  status_otorisasi text NOT NULL CHECK (status_otorisasi IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  authorized_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Financial reports table
CREATE TABLE IF NOT EXISTS financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_start date NOT NULL,
  periode_end date NOT NULL,
  tipe_laporan text NOT NULL CHECK (tipe_laporan IN ('bulanan', 'triwulan', 'tahunan')),
  total_pemasukan decimal(15,2) NOT NULL DEFAULT 0,
  total_pengeluaran decimal(15,2) NOT NULL DEFAULT 0,
  saldo_akhir decimal(15,2) NOT NULL DEFAULT 0,
  laporan_data jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Members policies
CREATE POLICY "Members can read own data"
  ON members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND member_id = members.id
    )
  );

CREATE POLICY "Admin and pengurus can read all members"
  ON members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage members"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Dues policies
CREATE POLICY "Members can read own dues"
  ON dues
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT member_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin and pengurus can read all dues"
  ON dues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage dues"
  ON dues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Loans policies
CREATE POLICY "Members can read own loans"
  ON loans
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT member_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin and pengurus can read all loans"
  ON loans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage loans"
  ON loans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Loan payments policies
CREATE POLICY "Members can read own loan payments"
  ON loan_payments
  FOR SELECT
  TO authenticated
  USING (
    loan_id IN (
      SELECT l.id FROM loans l
      JOIN users u ON l.member_id = u.member_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Admin and pengurus can read all loan payments"
  ON loan_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage loan payments"
  ON loan_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Expenses policies
CREATE POLICY "Admin and pengurus can read all expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Financial reports policies
CREATE POLICY "Admin and pengurus can read all reports"
  ON financial_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

CREATE POLICY "Admin and pengurus can manage reports"
  ON financial_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_nik ON members(nik);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status_keanggotaan);
CREATE INDEX IF NOT EXISTS idx_dues_member_period ON dues(member_id, tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_loans_member_status ON loans(member_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(tanggal);
CREATE INDEX IF NOT EXISTS idx_expenses_kategori ON expenses(kategori);
CREATE INDEX IF NOT EXISTS idx_financial_reports_periode ON financial_reports(periode_start, periode_end);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dues_updated_at BEFORE UPDATE ON dues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();