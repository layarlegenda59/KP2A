import express from 'express';
import {
    findUserByEmail,
    findUserById,
    verifyPassword,
    createUser,
    generateAccessToken,
    generateRefreshToken,
    createSession,
    validateRefreshToken,
    deleteSession,
    deleteUserSessions,
    updateUserPassword
} from '../services/auth.service.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password diperlukan' });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        await createSession(user.id, refreshToken);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                member_id: user.member_id,
                member: user.nama_lengkap ? {
                    id: user.member_id,
                    nama_lengkap: user.nama_lengkap,
                    no_hp: user.no_hp,
                    id_anggota: user.id_anggota
                } : null
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Gagal login' });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, role = 'anggota' } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password diperlukan' });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        const user = await createUser({ email, password, role });
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        await createSession(user.id, refreshToken);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                member_id: user.member_id
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Gagal mendaftar' });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token diperlukan' });
        }

        const session = await validateRefreshToken(refreshToken);
        if (!session) {
            return res.status(401).json({ error: 'Refresh token tidak valid' });
        }

        const user = await findUserById(session.user_id);
        if (!user) {
            return res.status(401).json({ error: 'User tidak ditemukan' });
        }

        const newAccessToken = generateAccessToken(user);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                member_id: user.member_id,
                member: user.nama_lengkap ? {
                    id: user.member_id,
                    nama_lengkap: user.nama_lengkap,
                    no_hp: user.no_hp,
                    id_anggota: user.id_anggota
                } : null
            },
            accessToken: newAccessToken
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Gagal refresh token' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await deleteSession(refreshToken);
        }

        res.json({ message: 'Logout berhasil' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Gagal logout' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'sidarsih_jwt_secret_key_2025');

        const user = await findUserById(decoded.id);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id,
            member: user.nama_lengkap ? {
                id: user.member_id,
                nama_lengkap: user.nama_lengkap,
                no_hp: user.no_hp,
                id_anggota: user.id_anggota
            } : null
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(401).json({ error: 'Token tidak valid' });
    }
});

// Change password
router.post('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'sidarsih_jwt_secret_key_2025');

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter' });
        }

        await updateUserPassword(decoded.id, newPassword);
        await deleteUserSessions(decoded.id);

        res.json({ message: 'Password berhasil diubah' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Gagal mengubah password' });
    }
});

export default router;
