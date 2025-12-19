/**
 * SQLite Database Initialization for Browser Environment
 * This file initializes the SQLite database with default admin user
 */

import { databaseClient, getDatabaseMode } from './database'

/**
 * Hash password using Web Crypto API (browser-compatible)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Initialize SQLite database with default admin user
 */
export async function initializeSQLiteDatabase(): Promise<void> {
  try {
    console.log('🔄 Initializing SQLite database...')
    
    const mode = getDatabaseMode()
    if (mode !== 'sqlite') {
      console.log('Not in SQLite mode, skipping initialization')
      return
    }

    // Check if admin user already exists
    const { data: existingAdmin } = await databaseClient
      .from('users')
      .select('*')
      .eq('email', 'admin@kp2a.com')
      .single()

    if (existingAdmin && !existingAdmin.error) {
      console.log('✅ Admin user already exists')
      return
    }

    // Create default admin user
    const adminPasswordHash = await hashPassword('admin123')
    
    const { data, error } = await databaseClient
      .from('users')
      .insert({
        email: 'admin@kp2a.com',
        password_hash: adminPasswordHash,
        full_name: 'Administrator KP2A',
        role: 'admin',
        is_active: true,
        phone: '',
        address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ Failed to create admin user:', error)
      throw error
    }

    console.log('✅ Default admin user created successfully!')
    console.log('📧 Email: admin@kp2a.com')
    console.log('🔑 Password: admin123')
    
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error)
    throw error
  }
}

/**
 * Create demo data for testing
 */
export async function createDemoData(): Promise<void> {
  try {
    console.log('🔄 Creating demo data...')
    
    // Create demo member
    const { data: memberData, error: memberError } = await databaseClient
      .from('members')
      .insert({
        nama_lengkap: 'John Doe',
        id_anggota: 'A0001',
        no_hp: '081234567890',
        alamat: 'Jl. Contoh No. 123',
        status_keanggotaan: 'aktif',
        jabatan: 'anggota',
        tanggal_masuk: new Date().toISOString().split('T')[0]
      })

    if (memberError) {
      console.warn('Demo member creation failed:', memberError)
    } else {
      console.log('✅ Demo member created')
    }

    console.log('✅ Demo data creation completed')
    
  } catch (error) {
    console.warn('Demo data creation failed:', error)
  }
}

// Export hash functions for use in authentication
export { hashPassword, verifyPassword }