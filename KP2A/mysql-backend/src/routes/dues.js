import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all dues with member info
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { bulan, tahun, member_id } = req.query;

        let query = `
      SELECT d.*, m.nama_lengkap, m.id_anggota 
      FROM dues d 
      JOIN members m ON d.member_id = m.id 
      WHERE 1=1
    `;
        const params = [];

        if (bulan) {
            query += ' AND d.bulan = ?';
            params.push(bulan);
        }
        if (tahun) {
            query += ' AND d.tahun = ?';
            params.push(tahun);
        }
        if (member_id) {
            query += ' AND d.member_id = ?';
            params.push(member_id);
        }

        query += ' ORDER BY d.tahun DESC, d.bulan DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Get dues error:', error);
        res.status(500).json({ error: 'Gagal mengambil data iuran' });
    }
});

// Get dues by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT d.*, m.nama_lengkap, m.id_anggota 
       FROM dues d 
       JOIN members m ON d.member_id = m.id 
       WHERE d.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Iuran tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Get due error:', error);
        res.status(500).json({ error: 'Gagal mengambil data iuran' });
    }
});

// Create due
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!req.body.member_id && req.body.id_anggota) {
            // Lookup member_id by id_anggota
            const [members] = await pool.execute('SELECT id FROM members WHERE id_anggota = ?', [req.body.id_anggota]);
            if (members.length > 0) {
                req.body.member_id = members[0].id;
            } else {
                return res.status(404).json({ error: `Anggota dengan ID ${req.body.id_anggota} tidak ditemukan` });
            }
        }

        const {
            member_id,
            bulan,
            tahun,
            iuran_wajib = 0,
            iuran_sukarela = 0,
            simpanan_wajib = 0,
            tanggal_bayar,
            status = 'belum_lunas'
        } = req.body;

        if (!member_id || !bulan || !tahun || !tanggal_bayar) {
            return res.status(400).json({ error: 'Data tidak lengkap (member_id/id_anggota, bulan, tahun, tanggal_bayar wajib)' });
        }

        const id = uuidv4();

        await pool.execute(
            `INSERT INTO dues (id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status]
        );

        const [rows] = await pool.execute(
            `SELECT d.*, m.nama_lengkap, m.id_anggota 
       FROM dues d 
       JOIN members m ON d.member_id = m.id 
       WHERE d.id = ?`,
            [id]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create due error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Iuran untuk bulan/tahun ini sudah ada' });
        }
        res.status(500).json({ error: 'Gagal menambah iuran' });
    }
});

// Update due
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status } = req.body;

        await pool.execute(
            `UPDATE dues SET 
        iuran_wajib = COALESCE(?, iuran_wajib),
        iuran_sukarela = COALESCE(?, iuran_sukarela),
        simpanan_wajib = COALESCE(?, simpanan_wajib),
        tanggal_bayar = COALESCE(?, tanggal_bayar),
        status = COALESCE(?, status)
       WHERE id = ?`,
            [iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status, id]
        );

        const [rows] = await pool.execute(
            `SELECT d.*, m.nama_lengkap, m.id_anggota 
       FROM dues d 
       JOIN members m ON d.member_id = m.id 
       WHERE d.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Iuran tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Update due error:', error);
        res.status(500).json({ error: 'Gagal mengupdate iuran' });
    }
});

// Delete due
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM dues WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Iuran tidak ditemukan' });
        }

        res.json({ message: 'Iuran berhasil dihapus' });
    } catch (error) {
        console.error('Delete due error:', error);
        res.status(500).json({ error: 'Gagal menghapus iuran' });
    }
});

export default router;
