
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from mysql-backend
dotenv.config({ path: join(__dirname, '../src/.env') }); // Try specific path or default

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sidarsih',
    password: process.env.DB_PASSWORD || 'sidarsih123',
    database: process.env.DB_NAME || 'sidarsih',
};

async function resetAdmin() {
    console.log('Connecting to database...', DB_CONFIG.user);
    const connection = await createConnection(DB_CONFIG);

    try {
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        console.log('Generated new hash for "admin123":', hash);

        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hash, 'admin@sidarsih.com']
        );

        console.log('Update result:', result);

        // Also verify if the user exists
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@sidarsih.com']);
        console.log('User found:', users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

resetAdmin();
