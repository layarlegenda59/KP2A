import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { kategori, status_otorisasi, tanggal_start, tanggal_end } = req.query;

        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (kategori) {
            query += ' AND kategori = ?';
            params.push(kategori);
        }
        if (status_otorisasi) {
            query += ' AND status_otorisasi = ?';
            params.push(status_otorisasi);
        }
        if (tanggal_start) {
            query += ' AND tanggal >= ?';
            params.push(tanggal_start);
        }
        if (tanggal_end) {
            query += ' AND tanggal <= ?';
            params.push(tanggal_end);
        }

        query += ' ORDER BY tanggal DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
    }
});

// Get expense by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM expenses WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Get expense error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
    }
});

// Create expense
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            type = 'debit',
            kategori,
            deskripsi,
            jumlah,
            tanggal,
            bukti_pengeluaran,
            status_otorisasi = 'pending'
        } = req.body;

        if (!kategori || jumlah === undefined || jumlah === null || !tanggal) {
            return res.status(400).json({ error: 'Data tidak lengkap (kategori, jumlah, tanggal wajib diisi)' });
        }

        const id = uuidv4();
        const created_by = req.user.id;

        await pool.execute(
            `INSERT INTO expenses (id, type, kategori, deskripsi, jumlah, tanggal, bukti_pengeluaran, status_otorisasi, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, type, kategori, deskripsi || '', jumlah, tanggal, bukti_pengeluaran || null, status_otorisasi, created_by]
        );

        const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create expense error:', error);
        // Return more detailed error for debugging
        const errorMessage = error.code === 'ER_DATA_TOO_LONG'
            ? `Data terlalu panjang: ${error.message}`
            : error.code === 'ER_TRUNCATED_WRONG_VALUE'
                ? `Format data salah: ${error.message}`
                : `Gagal menambah pengeluaran: ${error.message}`;
        res.status(500).json({ error: errorMessage });
    }
});

// Update expense
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, kategori, deskripsi, jumlah, tanggal, bukti_pengeluaran, status_otorisasi, authorized_by } = req.body;

        await pool.execute(
            `UPDATE expenses SET 
        type = COALESCE(?, type),
        kategori = COALESCE(?, kategori),
        deskripsi = COALESCE(?, deskripsi),
        jumlah = COALESCE(?, jumlah),
        tanggal = COALESCE(?, tanggal),
        bukti_pengeluaran = COALESCE(?, bukti_pengeluaran),
        status_otorisasi = COALESCE(?, status_otorisasi),
        authorized_by = COALESCE(?, authorized_by)
       WHERE id = ?`,
            [type || null, kategori || null, deskripsi || null, jumlah || null, tanggal || null, bukti_pengeluaran || null, status_otorisasi || null, authorized_by || null, id]
        );

        const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Gagal mengupdate pengeluaran' });
    }
});

// Delete expense
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM expenses WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
        }

        res.json({ message: 'Pengeluaran berhasil dihapus' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
    }
});

// Approve/Reject expense
router.post('/:id/authorize', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status harus approved atau rejected' });
        }

        await pool.execute(
            'UPDATE expenses SET status_otorisasi = ?, authorized_by = ? WHERE id = ?',
            [status, req.user.id, id]
        );

        const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Authorize expense error:', error);
        res.status(500).json({ error: 'Gagal mengotorisasi pengeluaran' });
    }
});

export default router;
