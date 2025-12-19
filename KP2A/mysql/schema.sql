-- SIDARSIH MySQL Database Schema
-- Run with: sudo mysql < mysql/schema.sql

-- Create database
CREATE DATABASE IF NOT EXISTS sidarsih CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'sidarsih'@'localhost' IDENTIFIED BY 'sidarsih123';
GRANT ALL PRIVILEGES ON sidarsih.* TO 'sidarsih'@'localhost';
FLUSH PRIVILEGES;

USE sidarsih;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_anggota VARCHAR(50) UNIQUE,
    nama_lengkap VARCHAR(255) NOT NULL,
    nik VARCHAR(20) NOT NULL,
    alamat TEXT NOT NULL,
    no_hp VARCHAR(20) NOT NULL,
    status_keanggotaan ENUM('aktif', 'non_aktif', 'pending') DEFAULT 'pending',
    tanggal_masuk DATE NOT NULL,
    jabatan VARCHAR(100) NOT NULL DEFAULT 'Anggota',
    foto VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_id_anggota (id_anggota),
    INDEX idx_status (status_keanggotaan),
    INDEX idx_no_hp (no_hp)
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'pengurus', 'anggota') DEFAULT 'anggota',
    member_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Sessions table (for JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_expires_at (expires_at)
);

-- Dues table (iuran)
CREATE TABLE IF NOT EXISTS dues (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    member_id CHAR(36) NOT NULL,
    bulan INT NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    tahun INT NOT NULL,
    iuran_wajib DECIMAL(15,2) NOT NULL DEFAULT 0,
    iuran_sukarela DECIMAL(15,2) NOT NULL DEFAULT 0,
    tanggal_bayar DATE NOT NULL,
    status ENUM('lunas', 'belum_lunas') DEFAULT 'belum_lunas',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_member_bulan_tahun (member_id, bulan, tahun),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    INDEX idx_member_id (member_id),
    INDEX idx_bulan_tahun (bulan, tahun)
);

-- Loans table (pinjaman)
CREATE TABLE IF NOT EXISTS loans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    member_id CHAR(36) NOT NULL,
    jumlah_pinjaman DECIMAL(15,2) NOT NULL,
    bunga_persen DECIMAL(5,2) NOT NULL,
    tenor_bulan INT NOT NULL,
    angsuran_bulanan DECIMAL(15,2) NOT NULL,
    tanggal_pinjaman DATE NOT NULL,
    status ENUM('aktif', 'lunas', 'pending', 'ditolak') DEFAULT 'pending',
    sisa_pinjaman DECIMAL(15,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    INDEX idx_member_id (member_id),
    INDEX idx_status (status)
);

-- Loan payments table (pembayaran angsuran)
CREATE TABLE IF NOT EXISTS loan_payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    loan_id CHAR(36) NOT NULL,
    angsuran_ke INT NOT NULL,
    angsuran_pokok DECIMAL(15,2) NOT NULL,
    angsuran_bunga DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_angsuran DECIMAL(15,2) NOT NULL,
    tanggal_bayar DATE NOT NULL,
    status ENUM('lunas', 'terlambat') DEFAULT 'lunas',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_loan_angsuran (loan_id, angsuran_ke),
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    INDEX idx_loan_id (loan_id)
);

-- Expenses table (pengeluaran)
CREATE TABLE IF NOT EXISTS expenses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    kategori VARCHAR(100) NOT NULL,
    deskripsi TEXT NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    tanggal DATE NOT NULL,
    bukti_pengeluaran VARCHAR(500),
    status_otorisasi ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_by CHAR(36) NOT NULL,
    authorized_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_by (created_by),
    INDEX idx_tanggal (tanggal),
    INDEX idx_kategori (kategori)
);

-- =====================================================
-- WHATSAPP TABLES
-- =====================================================

-- WhatsApp config
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    status ENUM('active', 'inactive') DEFAULT 'inactive',
    welcome_message VARCHAR(1000) DEFAULT 'Selamat datang di KP2A Cimahi!',
    phone_number VARCHAR(20),
    auto_reply BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- WhatsApp templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name (name)
);

-- =====================================================
-- TRANSACTION TABLES
-- =====================================================

-- Transaction categories
CREATE TABLE IF NOT EXISTS transaction_categories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name_type (name, type)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category_id CHAR(36),
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    tanggal DATE NOT NULL,
    reference_type VARCHAR(50),
    reference_id CHAR(36),
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES transaction_categories(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_tanggal (tanggal),
    INDEX idx_category (category_id)
);

-- =====================================================
-- BROADCAST TABLES
-- =====================================================

-- Contact groups
CREATE TABLE IF NOT EXISTS contact_groups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('draft', 'scheduled', 'sending', 'completed', 'failed') DEFAULT 'draft',
    scheduled_at DATETIME,
    sent_at DATETIME,
    total_recipients INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default WhatsApp config
INSERT INTO whatsapp_config (status, welcome_message, auto_reply) 
VALUES ('inactive', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.', FALSE)
ON DUPLICATE KEY UPDATE id = id;

-- Insert default WhatsApp templates
INSERT INTO whatsapp_templates (name, content) VALUES 
('welcome', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.'),
('help', 'Menu yang tersedia:\n1. info - Informasi organisasi\n2. saldo - Cek saldo iuran\n3. pinjaman - Info pinjaman\n4. kontak - Hubungi admin'),
('info', 'KP2A Cimahi adalah organisasi yang melayani kebutuhan finansial anggota dengan berbagai produk simpan pinjam.'),
('kontak', 'Untuk informasi lebih lanjut, hubungi admin di nomor: 0812-3456-7890')
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- Insert default transaction categories
INSERT INTO transaction_categories (name, type, description) VALUES
('Iuran Wajib', 'income', 'Iuran wajib bulanan anggota'),
('Iuran Sukarela', 'income', 'Iuran sukarela anggota'),
('Angsuran Pinjaman', 'income', 'Pembayaran angsuran pinjaman'),
('Pinjaman Baru', 'expense', 'Pencairan pinjaman baru'),
('Operasional', 'expense', 'Biaya operasional'),
('Administrasi', 'expense', 'Biaya administrasi')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (id, email, password_hash, role) VALUES
(UUID(), 'admin@sidarsih.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.HmK0cF8Iz5LzOZFvCe', 'admin')
ON DUPLICATE KEY UPDATE id = id;

SELECT 'Database schema created successfully!' AS status;
