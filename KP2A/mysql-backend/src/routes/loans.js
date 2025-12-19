import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all loans with member info
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { member_id, status } = req.query;

        let query = `
      SELECT l.*, m.nama_lengkap, m.id_anggota 
      FROM loans l 
      JOIN members m ON l.member_id = m.id 
      WHERE 1=1
    `;
        const params = [];

        if (member_id) {
            query += ' AND l.member_id = ?';
            params.push(member_id);
        }
        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }

        query += ' ORDER BY l.tanggal_pinjaman DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pinjaman' });
    }
});

// Get loan by ID with payments
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [loans] = await pool.execute(
            `SELECT l.*, m.nama_lengkap, m.id_anggota 
       FROM loans l 
       JOIN members m ON l.member_id = m.id 
       WHERE l.id = ?`,
            [req.params.id]
        );

        if (loans.length === 0) {
            return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });
        }

        const [payments] = await pool.execute(
            'SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY angsuran_ke ASC',
            [req.params.id]
        );

        res.json({ ...loans[0], payments });
    } catch (error) {
        console.error('Get loan error:', error);
        res.status(500).json({ error: 'Gagal mengambil data pinjaman' });
    }
});

// Create loan
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            member_id,
            jumlah_pinjaman,
            bunga_persen,
            tenor_bulan,
            tanggal_pinjaman,
            status = 'pending'
        } = req.body;

        if (!member_id || jumlah_pinjaman === undefined || jumlah_pinjaman === null || bunga_persen === undefined || bunga_persen === null || !tenor_bulan || !tanggal_pinjaman) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        const totalBunga = jumlah_pinjaman * (bunga_persen / 100) * (tenor_bulan / 12);
        const totalPinjaman = parseFloat(jumlah_pinjaman) + totalBunga;
        const angsuran_bulanan = totalPinjaman / tenor_bulan;
        const sisa_pinjaman = totalPinjaman;

        const id = uuidv4();

        await pool.execute(
            `INSERT INTO loans (id, member_id, jumlah_pinjaman, bunga_persen, tenor_bulan, angsuran_bulanan, tanggal_pinjaman, status, sisa_pinjaman)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, member_id, jumlah_pinjaman, bunga_persen, tenor_bulan, angsuran_bulanan, tanggal_pinjaman, status, sisa_pinjaman]
        );

        const [rows] = await pool.execute(
            `SELECT l.*, m.nama_lengkap, m.id_anggota 
       FROM loans l 
       JOIN members m ON l.member_id = m.id 
       WHERE l.id = ?`,
            [id]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create loan error:', error);
        res.status(500).json({ error: 'Gagal menambah pinjaman' });
    }
});

// Update loan status
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, sisa_pinjaman } = req.body;

        await pool.execute(
            `UPDATE loans SET 
        status = COALESCE(?, status),
        sisa_pinjaman = COALESCE(?, sisa_pinjaman)
       WHERE id = ?`,
            [status, sisa_pinjaman, id]
        );

        const [rows] = await pool.execute(
            `SELECT l.*, m.nama_lengkap, m.id_anggota 
       FROM loans l 
       JOIN members m ON l.member_id = m.id 
       WHERE l.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Update loan error:', error);
        res.status(500).json({ error: 'Gagal mengupdate pinjaman' });
    }
});

// Delete loan
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM loans WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });
        }

        res.json({ message: 'Pinjaman berhasil dihapus' });
    } catch (error) {
        console.error('Delete loan error:', error);
        res.status(500).json({ error: 'Gagal menghapus pinjaman' });
    }
});

// ==================== LOAN PAYMENTS ====================

// Get loan payments
router.get('/:loanId/payments', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY angsuran_ke ASC',
            [req.params.loanId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Get loan payments error:', error);
        res.status(500).json({ error: 'Gagal mengambil data angsuran' });
    }
});

// Create loan payment
router.post('/:loanId/payments', authMiddleware, async (req, res) => {
    try {
        const { loanId } = req.params;
        const {
            angsuran_ke,
            angsuran_pokok,
            angsuran_bunga = 0,
            sisa_angsuran,
            tanggal_bayar,
            status = 'lunas'
        } = req.body;

        if (!angsuran_ke || !angsuran_pokok || !tanggal_bayar) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        const total_angsuran = parseFloat(angsuran_pokok) + parseFloat(angsuran_bunga);
        const id = uuidv4();

        await pool.execute(
            `INSERT INTO loan_payments (id, loan_id, angsuran_ke, angsuran_pokok, angsuran_bunga, total_angsuran, sisa_angsuran, tanggal_bayar, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, loanId, angsuran_ke, angsuran_pokok, angsuran_bunga, total_angsuran, sisa_angsuran, tanggal_bayar, status]
        );

        // Update sisa pinjaman
        await pool.execute(
            'UPDATE loans SET sisa_pinjaman = sisa_pinjaman - ? WHERE id = ?',
            [total_angsuran, loanId]
        );

        const [rows] = await pool.execute(
            'SELECT * FROM loan_payments WHERE id = ?',
            [id]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create loan payment error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Angsuran ke-n sudah dibayar' });
        }
        res.status(500).json({ error: 'Gagal menambah pembayaran' });
    }
});

// Update loan payment
router.put('/:loanId/payments/:paymentId', authMiddleware, async (req, res) => {
    try {
        const { loanId, paymentId } = req.params;
        const {
            angsuran_ke,
            angsuran_pokok,
            angsuran_bunga = 0,
            sisa_angsuran,
            tanggal_bayar,
            status
        } = req.body;

        if (!angsuran_ke || !angsuran_pokok || !tanggal_bayar) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // Get the old payment details to calculate the difference
        const [oldPaymentRows] = await pool.execute(
            'SELECT total_angsuran FROM loan_payments WHERE id = ? AND loan_id = ?',
            [paymentId, loanId]
        );

        if (oldPaymentRows.length === 0) {
            return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
        }

        const old_total_angsuran = parseFloat(oldPaymentRows[0].total_angsuran) || 0;
        const new_total_angsuran = parseFloat(angsuran_pokok) + parseFloat(angsuran_bunga);
        const difference = new_total_angsuran - old_total_angsuran;

        // Update the payment record
        await pool.execute(
            `UPDATE loan_payments SET 
            angsuran_ke = ?,
            angsuran_pokok = ?,
            angsuran_bunga = ?,
            total_angsuran = ?,
            sisa_angsuran = ?,
            tanggal_bayar = ?,
            status = ?
       WHERE id = ? AND loan_id = ?`,
            [angsuran_ke, angsuran_pokok, angsuran_bunga, new_total_angsuran, sisa_angsuran, tanggal_bayar, status, paymentId, loanId]
        );

        // Update sisa_pinjaman based on the difference
        // If new payment is higher, reduce sisa_pinjaman more (subtract positive difference)
        // If new payment is lower, increase sisa_pinjaman (subtract negative difference = add)
        if (difference !== 0) {
            await pool.execute(
                'UPDATE loans SET sisa_pinjaman = sisa_pinjaman - ? WHERE id = ?',
                [difference, loanId]
            );
        }

        const [rows] = await pool.execute(
            'SELECT * FROM loan_payments WHERE id = ?',
            [paymentId]
        );

        res.json(rows[0]);
    } catch (error) {
        console.error('Update loan payment error:', error);
        res.status(500).json({ error: 'Gagal mengupdate pembayaran' });
    }
});

// Delete loan payment
router.delete('/:loanId/payments/:paymentId', authMiddleware, async (req, res) => {
    try {
        const { loanId, paymentId } = req.params;
        console.log(`🗑️ Delete payment request: loanId=${loanId}, paymentId=${paymentId}`);

        // Get payment details before deleting for refund calculation
        const [paymentRows] = await pool.execute(
            'SELECT total_angsuran FROM loan_payments WHERE id = ? AND loan_id = ?',
            [paymentId, loanId]
        );

        if (paymentRows.length === 0) {
            console.log('❌ Payment not found - may have been already deleted');
            return res.status(404).json({ error: 'Pembayaran tidak ditemukan atau sudah dihapus' });
        }

        const total_angsuran = parseFloat(paymentRows[0].total_angsuran) || 0;
        console.log(`💰 Payment total_angsuran: ${total_angsuran}`);

        // Get current loan details including max sisa_pinjaman
        const [loanRows] = await pool.execute(
            'SELECT jumlah_pinjaman, bunga_persen, tenor_bulan, sisa_pinjaman FROM loans WHERE id = ?',
            [loanId]
        );

        if (loanRows.length === 0) {
            return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });
        }

        const loan = loanRows[0];
        const jumlah_pinjaman = parseFloat(loan.jumlah_pinjaman) || 0;
        const bunga_persen = parseFloat(loan.bunga_persen) || 0;
        const tenor_bulan = parseInt(loan.tenor_bulan) || 1;
        const current_sisa = parseFloat(loan.sisa_pinjaman) || 0;

        // Calculate max allowed sisa_pinjaman (principal + interest)
        const totalBunga = jumlah_pinjaman * (bunga_persen / 100) * (tenor_bulan / 12);
        const maxSisaPinjaman = jumlah_pinjaman + totalBunga;

        console.log(`📊 Before delete - sisa_pinjaman: ${current_sisa}`);
        console.log(`📊 Max allowed sisa_pinjaman: ${maxSisaPinjaman}`);

        // Delete the payment first
        const [deleteResult] = await pool.execute(
            'DELETE FROM loan_payments WHERE id = ? AND loan_id = ?',
            [paymentId, loanId]
        );

        // Check if actually deleted (prevent double refund)
        if (deleteResult.affectedRows === 0) {
            console.log('❌ No rows deleted - payment may have been already deleted');
            return res.status(404).json({ error: 'Pembayaran sudah dihapus sebelumnya' });
        }
        console.log('✅ Payment deleted from loan_payments table');

        // Calculate new sisa_pinjaman, capped at max
        let newSisaPinjaman = current_sisa + total_angsuran;
        if (newSisaPinjaman > maxSisaPinjaman) {
            console.log(`⚠️ Capping sisa_pinjaman from ${newSisaPinjaman} to ${maxSisaPinjaman}`);
            newSisaPinjaman = maxSisaPinjaman;
        }

        // Update sisa_pinjaman with absolute value (not relative) to prevent race conditions
        await pool.execute(
            'UPDATE loans SET sisa_pinjaman = ? WHERE id = ?',
            [newSisaPinjaman, loanId]
        );
        console.log(`✅ Updated sisa_pinjaman to: ${newSisaPinjaman}`);

        res.json({
            message: 'Pembayaran berhasil dihapus',
            sisa_pinjaman: newSisaPinjaman
        });
    } catch (error) {
        console.error('Delete loan payment error:', error);
        res.status(500).json({ error: 'Gagal menghapus pembayaran' });
    }
});

export default router;
