/*
  # Seed Data for KP2A Cimahi Financial System

  This migration adds sample data for testing the application.
  
  1. Sample members
  2. Sample admin user
  3. Sample dues data
  4. Sample loans
  5. Sample expenses
*/

-- Insert sample members
INSERT INTO members (id, nama_lengkap, nik, alamat, no_hp, status_keanggotaan, tanggal_masuk, jabatan) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso', '3273010101800001', 'Jl. Sudirman No. 123, Cimahi', '081234567001', 'aktif', '2020-01-15', 'Ketua'),
('550e8400-e29b-41d4-a716-446655440002', 'Siti Nurhaliza', '3273010201800002', 'Jl. Ahmad Yani No. 456, Cimahi', '081234567002', 'aktif', '2020-02-20', 'Bendahara'),
('550e8400-e29b-41d4-a716-446655440003', 'Ahmad Rahman', '3273010301800003', 'Jl. Gatot Subroto No. 789, Cimahi', '081234567003', 'aktif', '2020-03-10', 'Sekretaris'),
('550e8400-e29b-41d4-a716-446655440004', 'Maria Susanti', '3273010401800004', 'Jl. Diponegoro No. 321, Cimahi', '081234567004', 'aktif', '2020-04-05', 'Anggota'),
('550e8400-e29b-41d4-a716-446655440005', 'Dedi Kurniawan', '3273010501800005', 'Jl. Veteran No. 654, Cimahi', '081234567005', 'aktif', '2020-05-12', 'Anggota'),
('550e8400-e29b-41d4-a716-446655440006', 'Rina Wati', '3273010601800006', 'Jl. Cihampelas No. 987, Cimahi', '081234567006', 'aktif', '2020-06-18', 'Anggota'),
('550e8400-e29b-41d4-a716-446655440007', 'Eko Prasetyo', '3273010701800007', 'Jl. Braga No. 147, Cimahi', '081234567007', 'aktif', '2020-07-22', 'Anggota'),
('550e8400-e29b-41d4-a716-446655440008', 'Dewi Sartika', '3273010801800008', 'Jl. Asia Afrika No. 258, Cimahi', '081234567008', 'aktif', '2020-08-30', 'Anggota');

-- Insert sample dues data for the last 6 months
INSERT INTO dues (member_id, bulan, tahun, iuran_wajib, iuran_sukarela, tanggal_bayar, status) VALUES
-- January 2024
('550e8400-e29b-41d4-a716-446655440001', 1, 2024, 50000, 25000, '2024-01-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440002', 1, 2024, 50000, 30000, '2024-01-07', 'lunas'),
('550e8400-e29b-41d4-a716-446655440003', 1, 2024, 50000, 20000, '2024-01-10', 'lunas'),
('550e8400-e29b-41d4-a716-446655440004', 1, 2024, 50000, 0, '2024-01-15', 'lunas'),
('550e8400-e29b-41d4-a716-446655440005', 1, 2024, 50000, 15000, '2024-01-20', 'lunas'),
-- February 2024
('550e8400-e29b-41d4-a716-446655440001', 2, 2024, 50000, 25000, '2024-02-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440002', 2, 2024, 50000, 35000, '2024-02-07', 'lunas'),
('550e8400-e29b-41d4-a716-446655440003', 2, 2024, 50000, 20000, '2024-02-10', 'lunas'),
('550e8400-e29b-41d4-a716-446655440004', 2, 2024, 50000, 10000, '2024-02-15', 'lunas'),
-- March 2024
('550e8400-e29b-41d4-a716-446655440001', 3, 2024, 50000, 30000, '2024-03-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440002', 3, 2024, 50000, 40000, '2024-03-07', 'lunas'),
('550e8400-e29b-41d4-a716-446655440003', 3, 2024, 50000, 25000, '2024-03-10', 'lunas'),
-- April 2024
('550e8400-e29b-41d4-a716-446655440001', 4, 2024, 50000, 25000, '2024-04-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440002', 4, 2024, 50000, 30000, '2024-04-07', 'lunas'),
-- May 2024
('550e8400-e29b-41d4-a716-446655440001', 5, 2024, 50000, 25000, '2024-05-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440002', 5, 2024, 50000, 30000, '2024-05-07', 'lunas'),
-- June 2024 (current month - some pending)
('550e8400-e29b-41d4-a716-446655440001', 6, 2024, 50000, 25000, '2024-06-05', 'lunas'),
('550e8400-e29b-41d4-a716-446655440003', 6, 2024, 50000, 0, '2024-06-15', 'belum_lunas');

-- Insert sample loans
INSERT INTO loans (id, member_id, jumlah_pinjaman, bunga_persen, tenor_bulan, angsuran_bulanan, tanggal_pinjaman, status, sisa_pinjaman) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 5000000, 2.0, 12, 442450, '2024-01-10', 'aktif', 2650000),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 3000000, 2.0, 10, 331470, '2024-02-15', 'aktif', 2000000),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 2000000, 1.5, 6, 349560, '2024-03-20', 'aktif', 1050000),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 1500000, 2.0, 8, 201870, '2024-01-05', 'lunas', 0);

-- Insert sample loan payments
INSERT INTO loan_payments (loan_id, angsuran_ke, angsuran_pokok, angsuran_bunga, total_angsuran, tanggal_bayar, status) VALUES
-- Loan 1 payments
('660e8400-e29b-41d4-a716-446655440001', 1, 342450, 100000, 442450, '2024-02-10', 'lunas'),
('660e8400-e29b-41d4-a716-446655440001', 2, 349380, 93070, 442450, '2024-03-10', 'lunas'),
('660e8400-e29b-41d4-a716-446655440001', 3, 356450, 86000, 442450, '2024-04-10', 'lunas'),
('660e8400-e29b-41d4-a716-446655440001', 4, 363660, 78790, 442450, '2024-05-10', 'lunas'),
('660e8400-e29b-41d4-a716-446655440001', 5, 371010, 71440, 442450, '2024-06-10', 'lunas'),
-- Loan 2 payments
('660e8400-e29b-41d4-a716-446655440002', 1, 271470, 60000, 331470, '2024-03-15', 'lunas'),
('660e8400-e29b-41d4-a716-446655440002', 2, 276890, 54580, 331470, '2024-04-15', 'lunas'),
('660e8400-e29b-41d4-a716-446655440002', 3, 282420, 49050, 331470, '2024-05-15', 'lunas'),
-- Loan 3 payments
('660e8400-e29b-41d4-a716-446655440003', 1, 319560, 30000, 349560, '2024-04-20', 'lunas'),
('660e8400-e29b-41d4-a716-446655440003', 2, 324350, 25210, 349560, '2024-05-20', 'lunas'),
('660e8400-e29b-41d4-a716-446655440003', 3, 329210, 20350, 349560, '2024-06-20', 'lunas');

-- Insert sample expenses
INSERT INTO expenses (kategori, deskripsi, jumlah, tanggal, status_otorisasi, created_by) VALUES
('Operasional', 'Pembelian alat tulis kantor', 150000, '2024-01-15', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Operasional', 'Biaya fotokopi dan print', 75000, '2024-01-20', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Konsumsi', 'Konsumsi rapat bulanan', 300000, '2024-02-10', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Transport', 'Biaya transport kunjungan ke koperasi lain', 200000, '2024-02-25', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Operasional', 'Pembelian kertas dan amplop', 125000, '2024-03-05', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Konsumsi', 'Konsumsi rapat triwulan', 500000, '2024-03-30', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Operasional', 'Biaya maintenance komputer', 250000, '2024-04-15', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Transport', 'Biaya perjalanan dinas', 300000, '2024-05-10', 'approved', (SELECT id FROM auth.users LIMIT 1)),
('Operasional', 'Pembelian tinta printer', 180000, '2024-06-01', 'pending', (SELECT id FROM auth.users LIMIT 1)),
('Konsumsi', 'Snack untuk tamu', 100000, '2024-06-15', 'pending', (SELECT id FROM auth.users LIMIT 1));