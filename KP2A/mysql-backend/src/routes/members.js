import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all members
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { limit, offset } = req.query;
        let query = 'SELECT * FROM members ORDER BY nama_lengkap ASC';
        const params = [];

        // Build query with LIMIT/OFFSET if provided
        // Note: LIMIT and OFFSET must be integers and are added directly to query (not as parameters)
        if (limit) {
            const limitNum = parseInt(limit);
            if (!isNaN(limitNum) && limitNum > 0) {
                query += ` LIMIT ${limitNum}`;
                
                if (offset) {
                    const offsetNum = parseInt(offset);
                    if (!isNaN(offsetNum) && offsetNum >= 0) {
                        query += ` OFFSET ${offsetNum}`;
                    }
                }
            }
        }

        console.log('📊 Executing query:', query);
        const [rows] = await pool.execute(query, params);
        console.log('✅ Members retrieved:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('❌ Get members error details:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
        res.status(500).json({ error: 'Gagal mengambil data anggota: ' + error.message });
    }
});

// Get member by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM members WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Anggota tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Get member error:', error);
        res.status(500).json({ error: 'Gagal mengambil data anggota' });
    }
});

// Create member
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('📝 Create Member Request:', req.body);
        const {
            id_anggota,
            nama_lengkap,
            nik,
            alamat,
            no_hp,
            status_keanggotaan = 'pending',
            tanggal_masuk,
            jabatan = 'Anggota',
            foto
        } = req.body;

        if (!nama_lengkap || !nik || !alamat || !no_hp || !tanggal_masuk) {
            console.warn('⚠️ Missing required fields:', { nama_lengkap, nik, alamat, no_hp, tanggal_masuk });
            return res.status(400).json({ error: 'Data tidak lengkap. Harap isi semua field wajib.' });
        }

        const id = uuidv4();
        // Convert empty string to null for nullable unique fields
        const finalIdAnggota = id_anggota === '' ? null : id_anggota;

        const values = [
            id,
            finalIdAnggota,
            nama_lengkap,
            nik,
            alamat,
            no_hp,
            status_keanggotaan,
            tanggal_masuk,
            jabatan,
            foto || null
        ];

        console.log('📊 Insert Values:', values);

        await pool.execute(
            `INSERT INTO members (id, id_anggota, nama_lengkap, nik, alamat, no_hp, status_keanggotaan, tanggal_masuk, jabatan, foto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            values
        );

        const [rows] = await pool.execute('SELECT * FROM members WHERE id = ?', [id]);
        console.log('✅ Member created successfully:', rows[0].id);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('❌ Create member error details:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('id_anggota')) {
                return res.status(400).json({ error: 'ID Anggota sudah terdaftar' });
            }
            if (error.message.includes('nik')) { // Assuming NIK might be unique in future schema updates, though currently not defined as unique in schema.sql viewed earlier, but good practice.
                // Checking schema.sql again: NIK is NOT unique currently, but id_anggota is.
            }
            return res.status(400).json({ error: 'Data duplikat ditemukan (ID Anggota mungkin sudah ada)' });
        }
        res.status(500).json({ error: 'Gagal menambah anggota: ' + error.message });
    }
});

// Update member
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📝 Update Member Request:', { id, body: req.body });

        const {
            id_anggota,
            nama_lengkap,
            nik,
            alamat,
            no_hp,
            status_keanggotaan,
            tanggal_masuk,
            jabatan,
            foto
        } = req.body;

        // Convert empty string to null for nullable unique fields
        const finalIdAnggota = id_anggota === '' ? null : id_anggota;

        // Ensure undefined values are null for database compatibility
        const values = [
            finalIdAnggota === undefined ? null : finalIdAnggota,
            nama_lengkap === undefined ? null : nama_lengkap,
            nik === undefined ? null : nik,
            alamat === undefined ? null : alamat,
            no_hp === undefined ? null : no_hp,
            status_keanggotaan === undefined ? null : status_keanggotaan,
            tanggal_masuk === undefined ? null : tanggal_masuk,
            jabatan === undefined ? null : jabatan,
            foto === undefined ? null : foto,
            id
        ];

        console.log('📊 Update Values:', values);

        await pool.execute(
            `UPDATE members SET 
        id_anggota = COALESCE(?, id_anggota),
        nama_lengkap = COALESCE(?, nama_lengkap),
        nik = COALESCE(?, nik),
        alamat = COALESCE(?, alamat),
        no_hp = COALESCE(?, no_hp),
        status_keanggotaan = COALESCE(?, status_keanggotaan),
        tanggal_masuk = COALESCE(?, tanggal_masuk),
        jabatan = COALESCE(?, jabatan),
        foto = COALESCE(?, foto)
       WHERE id = ?`,
            values
        );

        const [rows] = await pool.execute('SELECT * FROM members WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Anggota tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Update member error details:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'ID Anggota sudah digunakan' });
        }
        res.status(500).json({ error: 'Gagal mengupdate anggota: ' + error.message });
    }
});

// Delete member
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM members WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Anggota tidak ditemukan' });
        }

        res.json({ message: 'Anggota berhasil dihapus' });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Gagal menghapus anggota' });
    }
});

export default router;
