import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sidarsih_jwt_secret_key_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

export function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

export function generateRefreshToken() {
    return uuidv4() + '-' + uuidv4();
}

export async function createSession(userId, refreshToken) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.execute(
        'INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (UUID(), ?, ?, ?)',
        [userId, refreshToken, expiresAt]
    );

    return { refreshToken, expiresAt };
}

export async function validateRefreshToken(refreshToken) {
    const [rows] = await pool.execute(
        'SELECT s.*, u.email, u.role, u.member_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token = ? AND s.expires_at > NOW()',
        [refreshToken]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

export async function deleteSession(refreshToken) {
    await pool.execute('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
}

export async function deleteUserSessions(userId) {
    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export async function findUserByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT u.*, m.nama_lengkap, m.no_hp, m.id_anggota 
     FROM users u 
     LEFT JOIN members m ON u.member_id = m.id 
     WHERE u.email = ?`,
        [email]
    );
    return rows[0] || null;
}

export async function findUserById(id) {
    const [rows] = await pool.execute(
        `SELECT u.*, m.nama_lengkap, m.no_hp, m.id_anggota 
     FROM users u 
     LEFT JOIN members m ON u.member_id = m.id 
     WHERE u.id = ?`,
        [id]
    );
    return rows[0] || null;
}

export async function createUser({ email, password, role = 'anggota', memberId = null }) {
    const passwordHash = await hashPassword(password);
    const id = uuidv4();

    await pool.execute(
        'INSERT INTO users (id, email, password_hash, role, member_id) VALUES (?, ?, ?, ?, ?)',
        [id, email, passwordHash, role, memberId]
    );

    return { id, email, role, member_id: memberId };
}

export async function updateUserPassword(userId, newPassword) {
    const passwordHash = await hashPassword(newPassword);
    await pool.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, userId]
    );
}
