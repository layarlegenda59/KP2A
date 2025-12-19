#!/usr/bin/env node

/**
 * KP2A Cimahi - Database Setup Script
 * Setup SQLite database dengan schema dan admin user
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

// Configuration
const DB_PATH = path.join(process.cwd(), 'kp2a-cimahi.db')
const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'sqlite-schema.sql')
const BACKUP_DIR = path.join(process.cwd(), 'backups')

console.log('🚀 Starting KP2A Cimahi database setup...')
console.log('Database path:', DB_PATH)
console.log('')

try {
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    console.log('📁 Created backup directory')
  }
  
  // Backup existing database if exists
  if (fs.existsSync(DB_PATH)) {
    const backupPath = path.join(BACKUP_DIR, `backup-${Date.now()}.db`)
    fs.copyFileSync(DB_PATH, backupPath)
    console.log(`📦 Existing database backed up to: ${backupPath}`)
  }
  
  // Create new database
  console.log('🔧 Creating SQLite database...')
  const db = new Database(DB_PATH)
  
  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  console.log('⚙️  Database pragmas configured')
  
  // Read and execute schema
  if (fs.existsSync(SCHEMA_PATH)) {
    console.log('📋 Loading schema from:', SCHEMA_PATH)
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
    db.exec(schema)
    console.log('✅ Schema executed successfully')
  } else {
    console.log('⚠️  Schema file not found, creating basic structure')
    // Create basic tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        id_anggota TEXT UNIQUE NOT NULL,
        nama_lengkap TEXT NOT NULL,
        nik TEXT UNIQUE,
        alamat TEXT,
        no_hp TEXT,
        status_keanggotaan TEXT DEFAULT 'aktif',
        tanggal_masuk DATE,
        jabatan TEXT,
        foto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('✅ Basic schema created')
  }
  
  // Create default admin user
  console.log('👤 Creating default admin user...')
  
  // Check if admin already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@kp2acimahi.com')
  
  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists')
  } else {
    // Hash password
    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync('admin123', salt)
    
    // Insert admin user
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run('admin-001', 'admin@kp2acimahi.com', passwordHash, salt, 'admin', 1)
    console.log('✅ Default admin user created')
    console.log('   Email: admin@kp2acimahi.com')
    console.log('   Password: admin123')
  }
  
  // Verify database
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
  console.log(`📊 Database contains ${userCount} users`)
  
  // Close database
  db.close()
  
  console.log('')
  console.log('✅ Database setup completed successfully!')
  console.log(`📁 Database file: ${DB_PATH}`)
  console.log(`📁 Backups directory: ${BACKUP_DIR}`)
  
} catch (error) {
  console.error('💥 Database setup failed:', error.message)
  console.error(error.stack)
  process.exit(1)
}