import dotenv from 'dotenv';
import { findUserByEmail, createUser, hashPassword } from '../src/services/auth.service.js';
import pool from '../src/config/database.js';

dotenv.config();

async function createAdmin() {
  try {
    const email = 'admin@sidarsih.com';
    const password = 'admin123';

    // Check if admin already exists
    const existingAdmin = await findUserByEmail(email);
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', email);
      return;
    }

    // Create admin user
    const passwordHash = await hashPassword(password);
    const adminId = 'admin-' + Date.now();

    await pool.execute(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [adminId, email, passwordHash, 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🎯 Role: admin');
    console.log('');
    console.log('You can now login with these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
