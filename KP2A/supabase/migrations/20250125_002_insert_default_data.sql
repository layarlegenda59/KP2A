-- Enhanced Expenses Module Migration - Step 2: Insert Default Data
-- Migration: 002_insert_default_data.sql

-- Insert default categories
INSERT INTO transaction_categories (name, type, color_code, description) VALUES
('Iuran Anggota', 'income', '#10b981', 'Pemasukan dari iuran bulanan anggota'),
('Donasi', 'income', '#059669', 'Donasi dari pihak eksternal'),
('Bantuan Pemerintah', 'income', '#047857', 'Bantuan dana dari pemerintah'),
('Penjualan Produk', 'income', '#065f46', 'Pemasukan dari penjualan produk KP2A'),
('Operasional', 'expense', '#ef4444', 'Biaya operasional harian'),
('Pemeliharaan', 'expense', '#dc2626', 'Biaya pemeliharaan infrastruktur'),
('Administrasi', 'expense', '#b91c1c', 'Biaya administrasi dan dokumentasi'),
('Kegiatan Sosial', 'expense', '#991b1b', 'Pengeluaran untuk kegiatan sosial'),
('Transportasi', 'expense', '#7f1d1d', 'Biaya transportasi dan perjalanan'),
('Konsumsi', 'expense', '#450a0a', 'Biaya konsumsi dan makanan');

-- Insert default payment methods
INSERT INTO payment_methods (name, type, description) VALUES
('Tunai', 'cash', 'Pembayaran dengan uang tunai'),
('Transfer Bank', 'bank_transfer', 'Transfer melalui rekening bank'),
('E-Wallet (Dana)', 'digital', 'Pembayaran melalui Dana'),
('E-Wallet (GoPay)', 'digital', 'Pembayaran melalui GoPay'),
('E-Wallet (OVO)', 'digital', 'Pembayaran melalui OVO'),
('E-Wallet (ShopeePay)', 'digital', 'Pembayaran melalui ShopeePay'),
('Cek/Giro', 'check', 'Pembayaran dengan cek atau giro'),
('Kartu Debit', 'card', 'Pembayaran dengan kartu debit'),
('QRIS', 'digital', 'Pembayaran melalui QRIS');

-- Log the insertion
DO $$
BEGIN
    RAISE NOTICE 'Inserted % categories and % payment methods', 
        (SELECT COUNT(*) FROM transaction_categories),
        (SELECT COUNT(*) FROM payment_methods);
END $$;