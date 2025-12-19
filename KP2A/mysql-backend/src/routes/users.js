import { Router } from 'express';
import pool from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

// GET all users with member info
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                u.id,
                u.email,
                u.role,
                u.member_id,
                u.created_at,
                u.updated_at,
                m.id AS member_id,
                m.nama_lengkap,
                m.id_anggota,
                m.jabatan
            FROM users u
            LEFT JOIN members m ON u.member_id = m.id
            ORDER BY u.created_at DESC
        `);

        // Transform to include nested member object
        const usersWithMembers = users.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            member: user.nama_lengkap ? {
                id: user.member_id,
                nama_lengkap: user.nama_lengkap,
                id_anggota: user.id_anggota,
                jabatan: user.jabatan
            } : null
        }));

        res.json(usersWithMembers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Gagal mengambil data pengguna' });
    }
});

// GET single user
router.get('/:id', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                u.*,
                m.nama_lengkap,
                m.id_anggota,
                m.jabatan
            FROM users u
            LEFT JOIN members m ON u.member_id = m.id
            WHERE u.id = ?
        `, [req.params.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            member: user.nama_lengkap ? {
                id: user.member_id,
                nama_lengkap: user.nama_lengkap,
                id_anggota: user.id_anggota,
                jabatan: user.jabatan
            } : null
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Gagal mengambil data pengguna' });
    }
});

// CREATE user
router.post('/', async (req, res) => {
    try {
        const { email, role, member_id } = req.body;

        if (!email || !role) {
            return res.status(400).json({ error: 'Email dan role wajib diisi' });
        }

        // Check if email already exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        const id = crypto.randomUUID();
        await pool.execute(
            `INSERT INTO users (id, email, password_hash, role, member_id) 
             VALUES (?, ?, '', ?, ?)`,
            [id, email, role, member_id || null]
        );

        const [newUser] = await pool.execute(`
            SELECT 
                u.*,
                m.nama_lengkap,
                m.id_anggota,
                m.jabatan
            FROM users u
            LEFT JOIN members m ON u.member_id = m.id
            WHERE u.id = ?
        `, [id]);

        const user = newUser[0];
        res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            member: user.nama_lengkap ? {
                id: user.member_id,
                nama_lengkap: user.nama_lengkap,
                id_anggota: user.id_anggota,
                jabatan: user.jabatan
            } : null
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Gagal membuat pengguna' });
    }
});

// UPDATE user
router.put('/:id', async (req, res) => {
    try {
        const { email, role, member_id } = req.body;
        const userId = req.params.id;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (role) {
            updates.push('role = ?');
            values.push(role);
        }
        if (member_id !== undefined) {
            updates.push('member_id = ?');
            values.push(member_id || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Tidak ada data untuk diperbarui' });
        }

        values.push(userId);
        await pool.execute(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );

        const [updatedUser] = await pool.execute(`
            SELECT 
                u.*,
                m.nama_lengkap,
                m.id_anggota,
                m.jabatan
            FROM users u
            LEFT JOIN members m ON u.member_id = m.id
            WHERE u.id = ?
        `, [userId]);

        if (updatedUser.length === 0) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }

        const user = updatedUser[0];
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            member_id: user.member_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            member: user.nama_lengkap ? {
                id: user.member_id,
                nama_lengkap: user.nama_lengkap,
                id_anggota: user.id_anggota,
                jabatan: user.jabatan
            } : null
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Gagal memperbarui pengguna' });
    }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }

        // Prevent deleting self
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
        }

        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Gagal menghapus pengguna' });
    }
});

export default router;
