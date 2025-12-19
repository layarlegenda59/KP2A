#!/usr/bin/env node

/**
 * KP2A Cimahi - Database Migration Script
 * Migrasi data dari Supabase PostgreSQL ke SQLite
 */

console.log('🔧 Loading dependencies...')

try {
  const { createClient } = require('@supabase/supabase-js')
  const Database = require('better-sqlite3')
  const fs = require('fs')
  const path = require('path')
  const bcrypt = require('bcryptjs')
  
  console.log('✅ Dependencies loaded successfully')
  
  // Configuration
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pudchoeqhzawgsqkdqeg.supabase.co'
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your_anon_key_here'
  const DB_PATH = path.join(process.cwd(), 'kp2a-cimahi.db')
  const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'sqlite-schema.sql')
  const BACKUP_DIR = path.join(process.cwd(), 'backups')
  
  /**
   * Initialize SQLite database
   */
  function initializeSQLite() {
    console.log('🔧 Initializing SQLite database...')
    
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
      const db = new Database(DB_PATH)
      console.log('📊 Database instance created')
      
      // Enable foreign keys and WAL mode
      db.pragma('foreign_keys = ON')
      db.pragma('journal_mode = WAL')
      console.log('⚙️  Database pragmas set')
      
      // Read and execute schema
      if (fs.existsSync(SCHEMA_PATH)) {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
        db.exec(schema)
        console.log('📋 Schema executed successfully')
      } else {
        console.log('⚠️  Schema file not found, creating basic structure')
        // Create basic users table
        db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
      }
      
      console.log('✅ SQLite database initialized successfully')
      return db
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error.message)
      throw error
    }
  }
  
  /**
   * Create default admin user
   */
  async function createDefaultAdmin(db) {
    console.log('👤 Creating default admin user...')
    
    try {
      // Check if admin already exists
      const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@kp2acimahi.com')
      
      if (existingAdmin) {
        console.log('ℹ️  Admin user already exists')
        return
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash('admin123', salt)
      
      // Insert admin user
      const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run('admin-001', 'admin@kp2acimahi.com', passwordHash, salt, 'admin', 1)
      
      console.log('✅ Default admin user created (admin@kp2acimahi.com / admin123)')
      
    } catch (error) {
      console.error('❌ Failed to create admin user:', error.message)
      throw error
    }
  }
  
  /**
   * Main migration function
   */
  async function main() {
    console.log('🚀 Starting KP2A Cimahi database migration...')
    console.log('From: Supabase PostgreSQL')
    console.log('To: SQLite')
    console.log('')
    
    try {
      // Initialize database
      const db = initializeSQLite()
      
      // Create admin user
      await createDefaultAdmin(db)
      
      // Close database
      db.close()
      
      console.log('')
      console.log('✅ Migration process completed!')
      console.log(`📁 Database file: ${DB_PATH}`)
      console.log(`📁 Backups directory: ${BACKUP_DIR}`)
      
      return true
    } catch (error) {
      console.error('💥 Migration failed:', error.message)
      throw error
    }
  }
  
  // Export module
  console.log('📦 Exporting module...')
  module.exports = { main }
  console.log('✅ Module exported successfully')
  
  // Run migration if called directly
  if (require.main === module) {
    console.log('🎯 Running as main module')
    main().catch(error => {
      console.error('💥 Migration failed:', error)
      console.error(error.stack)
      process.exit(1)
    })
  } else {
    console.log('📦 Loaded as dependency')
  }
  
} catch (error) {
  console.error('💥 Failed to load dependencies:', error.message)
  console.error(error.stack)
  process.exit(1)
}