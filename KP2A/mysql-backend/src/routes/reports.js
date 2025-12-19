import express from 'express';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all reports
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.*, COALESCE(m.nama_lengkap, u.email) as created_by_name
             FROM financial_reports r
             LEFT JOIN users u ON r.created_by = u.id
             LEFT JOIN members m ON u.member_id = m.id
             ORDER BY r.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Gagal mengambil data laporan' });
    }
});

// Get single report
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute(
            `SELECT r.*, COALESCE(m.nama_lengkap, u.email) as created_by_name
             FROM financial_reports r
             LEFT JOIN users u ON r.created_by = u.id
             LEFT JOIN members m ON u.member_id = m.id
             WHERE r.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Gagal mengambil data laporan' });
    }
});

// Generate report data from actual transactions
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { periode_start, periode_end, tipe_laporan } = req.body;

        if (!periode_start || !periode_end || !tipe_laporan) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // Get dues data (Total Tagihan - Lunas & Belum Lunas)
        // OLD QUERY (Only Lunas):
        // `SELECT ... FROM dues WHERE tanggal_bayar BETWEEN ? AND ? AND status = 'lunas'`

        const [duesData] = await pool.execute(
            `SELECT 
                SUM(COALESCE(iuran_wajib, 0)) as total_iuran_wajib,
                SUM(COALESCE(iuran_sukarela, 0)) as total_simpanan_sukarela,
                SUM(COALESCE(simpanan_wajib, 0)) as total_simpanan_wajib,
                COUNT(*) as dues_count
             FROM dues 
             WHERE STR_TO_DATE(CONCAT(tahun, '-', LPAD(bulan, 2, '0'), '-01'), '%Y-%m-%d') BETWEEN ? AND ?`,
            [periode_start, periode_end]
        );

        // ... expenses and loans queries remains same ...

        // Loan payments logic:
        // Loan payments are transactions, so they are always "paid" when exists in loan_payments table.
        // Loans table has status, but we sum payments here.

        const [loanPaymentsData] = await pool.execute(
            `SELECT 
                SUM(COALESCE(total_angsuran, 0)) as total_pembayaran_pinjaman,
                COUNT(*) as payment_count
             FROM loan_payments 
             WHERE tanggal_bayar BETWEEN ? AND ?`,
            [periode_start, periode_end]
        );

        // Get expenses data (excluding internal bank transfers and loan disbursements - loans tracked separately)
        const [expensesData] = await pool.execute(
            `SELECT 
                SUM(CASE WHEN type = 'debit' THEN jumlah ELSE 0 END) as total_pengeluaran,
                SUM(CASE WHEN type = 'credit' THEN jumlah ELSE 0 END) as total_pemasukan_kas,
                COUNT(*) as expense_count
             FROM expenses 
             WHERE tanggal BETWEEN ? AND ?
             AND LOWER(kategori) NOT LIKE '%tarik kas bank%'
             AND LOWER(kategori) NOT LIKE '%transfer bank%'
             AND LOWER(kategori) NOT LIKE '%pinjaman anggota%'`,
            [periode_start, periode_end]
        );

        // Get Loan Disbursements (Pinjaman Cair)
        const [loansDisbursedData] = await pool.execute(
            `SELECT SUM(COALESCE(jumlah_pinjaman, 0)) as total_pinjaman_cair
             FROM loans
             WHERE tanggal_pinjaman BETWEEN ? AND ?
             AND status IN ('aktif', 'lunas')`,
            [periode_start, periode_end]
        );

        // Calculate totals
        const iuranWajib = parseFloat(duesData[0]?.total_iuran_wajib || 0);
        const simpananSukarela = parseFloat(duesData[0]?.total_simpanan_sukarela || 0);
        const simpananWajib = parseFloat(duesData[0]?.total_simpanan_wajib || 0);
        const pembayaranPinjaman = parseFloat(loanPaymentsData[0]?.total_pembayaran_pinjaman || 0);
        const pengeluaran = parseFloat(expensesData[0]?.total_pengeluaran || 0);
        const pemasukanKas = parseFloat(expensesData[0]?.total_pemasukan_kas || 0);
        const pinjamanCair = parseFloat(loansDisbursedData[0]?.total_pinjaman_cair || 0);

        const totalPemasukan = iuranWajib + simpananSukarela + simpananWajib + pembayaranPinjaman + pemasukanKas;
        const totalPengeluaran = pengeluaran + pinjamanCair; // Include Disbursement as Expense (Cashflow Out)
        const saldoAkhir = totalPemasukan - totalPengeluaran;

        // Get year-to-date accumulation
        const yearStart = `${new Date(periode_start).getFullYear()}-01-01`;

        // OLD YTD QUERY (Only Lunas):
        // `SELECT ... FROM dues WHERE tanggal_bayar BETWEEN ? AND ? AND status = 'lunas'`

        const [ytdDues] = await pool.execute(
            `SELECT 
                SUM(COALESCE(iuran_wajib, 0)) as ytd_iuran_wajib,
                SUM(COALESCE(iuran_sukarela, 0)) as ytd_simpanan_sukarela,
                SUM(COALESCE(simpanan_wajib, 0)) as ytd_simpanan_wajib
             FROM dues 
             WHERE STR_TO_DATE(CONCAT(tahun, '-', LPAD(bulan, 2, '0'), '-01'), '%Y-%m-%d') BETWEEN ? AND ?`,
            [yearStart, periode_end]
        );

        const [ytdLoanPayments] = await pool.execute(
            `SELECT SUM(COALESCE(total_angsuran, 0)) as ytd_pembayaran_pinjaman
             FROM loan_payments 
             WHERE tanggal_bayar BETWEEN ? AND ?`,
            [yearStart, periode_end]
        );

        const [ytdExpenses] = await pool.execute(
            `SELECT 
                SUM(CASE WHEN type = 'debit' THEN jumlah ELSE 0 END) as ytd_pengeluaran,
                SUM(CASE WHEN type = 'credit' AND LOWER(kategori) LIKE '%donasi%' THEN jumlah ELSE 0 END) as ytd_donasi
             FROM expenses 
             WHERE tanggal BETWEEN ? AND ?
             AND LOWER(kategori) NOT LIKE '%tarik kas bank%'
             AND LOWER(kategori) NOT LIKE '%transfer bank%'
             AND LOWER(kategori) NOT LIKE '%pinjaman anggota%'
             AND LOWER(kategori) NOT LIKE '%simpanan%'
             AND LOWER(kategori) NOT LIKE '%iuran%'`,
            [yearStart, periode_end]
        );

        const [ytdLoansDisbursed] = await pool.execute(
            `SELECT SUM(COALESCE(jumlah_pinjaman, 0)) as ytd_pinjaman_cair
             FROM loans
             WHERE tanggal_pinjaman BETWEEN ? AND ?
             AND status IN ('aktif', 'lunas')`,
            [yearStart, periode_end]
        );

        const ytdIuranWajib = parseFloat(ytdDues[0]?.ytd_iuran_wajib || 0);
        const ytdSimpananSukarela = parseFloat(ytdDues[0]?.ytd_simpanan_sukarela || 0);
        const ytdSimpananWajib = parseFloat(ytdDues[0]?.ytd_simpanan_wajib || 0);
        const ytdPembayaranPinjaman = parseFloat(ytdLoanPayments[0]?.ytd_pembayaran_pinjaman || 0);
        const ytdPengeluaran = parseFloat(ytdExpenses[0]?.ytd_pengeluaran || 0);
        const ytdDonasi = parseFloat(ytdExpenses[0]?.ytd_donasi || 0);
        const ytdPinjamanCair = parseFloat(ytdLoansDisbursed[0]?.ytd_pinjaman_cair || 0);

        const ytdTotalPemasukan = ytdIuranWajib + ytdSimpananSukarela + ytdSimpananWajib + ytdPembayaranPinjaman + ytdDonasi;
        const ytdTotalPengeluaran = ytdPengeluaran + ytdPinjamanCair;
        const ytdSaldoAkhir = ytdTotalPemasukan - ytdTotalPengeluaran;

        // ========== NERACA (Balance Sheet) Data ==========
        // Piutang Pinjaman Anggota (Outstanding Loans) = Sum of sisa_pinjaman where status = 'aktif'
        const [piutangData] = await pool.execute(
            `SELECT SUM(COALESCE(sisa_pinjaman, 0)) as total_piutang
             FROM loans WHERE status = 'aktif'`
        );
        const piutangPinjaman = parseFloat(piutangData[0]?.total_piutang || 0);

        // Total Simpanan Anggota (All time - these are liabilities, money owed to members)
        const [totalSimpananData] = await pool.execute(
            `SELECT 
                SUM(COALESCE(simpanan_wajib, 0)) as total_simpanan_wajib,
                SUM(COALESCE(iuran_sukarela, 0)) as total_simpanan_sukarela,
                SUM(COALESCE(iuran_wajib, 0)) as total_iuran_wajib
             FROM dues`
        );
        const totalSimpananWajibAllTime = parseFloat(totalSimpananData[0]?.total_simpanan_wajib || 0);
        const totalSimpananSukarelaAllTime = parseFloat(totalSimpananData[0]?.total_simpanan_sukarela || 0);
        const totalIuranWajibAllTime = parseFloat(totalSimpananData[0]?.total_iuran_wajib || 0);

        // Kas dan Bank = Saldo Akhir (simplified)
        const kasBank = ytdSaldoAkhir;

        // Total Harta = Kas + Piutang
        const totalHarta = kasBank + piutangPinjaman;

        // Total Kewajiban = Simpanan yang harus dikembalikan ke anggota
        const totalKewajiban = totalSimpananWajibAllTime + totalSimpananSukarelaAllTime;

        // Modal = Iuran Wajib (permanent capital) - No SHU since no interest on loans
        const modalIuranWajib = totalIuranWajibAllTime;

        // Total Modal = Just Iuran Wajib (no SHU)
        const totalModal = modalIuranWajib;

        const reportData = {
            // Laporan Keuangan (Income/Expense)
            uang_masuk: {
                iuran_wajib: ytdIuranWajib,
                simpanan_sukarela: ytdSimpananSukarela,
                simpanan_wajib: ytdSimpananWajib,
                angsuran_pinjaman: ytdPembayaranPinjaman,
                donasi: ytdDonasi,
                total: ytdTotalPemasukan
            },
            uang_keluar: {
                pinjaman_ke_anggota: ytdPinjamanCair,
                pengeluaran_operasional: ytdPengeluaran,
                total: ytdTotalPengeluaran
            },
            ringkasan: {
                total_uang_masuk: ytdTotalPemasukan,
                total_uang_keluar: ytdTotalPengeluaran,
                saldo_akhir: ytdSaldoAkhir
            },
            // Neraca (Balance Sheet) - Simplified without SHU
            neraca: {
                harta: {
                    kas_bank: kasBank,
                    piutang_pinjaman: piutangPinjaman,
                    total: totalHarta
                },
                kewajiban: {
                    simpanan_wajib: totalSimpananWajibAllTime,
                    simpanan_sukarela: totalSimpananSukarelaAllTime,
                    total: totalKewajiban
                },
                modal: {
                    iuran_wajib: modalIuranWajib,
                    total: totalModal
                },
                total_kewajiban_modal: totalKewajiban + totalModal
            },
            transaction_count: (parseInt(duesData[0]?.dues_count) || 0) + (parseInt(loanPaymentsData[0]?.payment_count) || 0) + (parseInt(expensesData[0]?.expense_count) || 0)
        };

        res.json({
            periode_start,
            periode_end,
            tipe_laporan,
            total_pemasukan: totalPemasukan,
            total_pengeluaran: totalPengeluaran,
            saldo_akhir: saldoAkhir,
            report_data: reportData
        });

    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ error: `Gagal generate laporan: ${error.message}` });
    }
});

// Create/Save report
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            periode_start,
            periode_end,
            tipe_laporan,
            total_pemasukan,
            total_pengeluaran,
            saldo_akhir,
            report_data,
            data_source = 'legacy',
            transaction_count = 0
        } = req.body;

        if (!periode_start || !periode_end || !tipe_laporan) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        const id = uuidv4();
        const created_by = req.user.id;

        await pool.execute(
            `INSERT INTO financial_reports 
             (id, periode_start, periode_end, tipe_laporan, total_pemasukan, total_pengeluaran, saldo_akhir, report_data, data_source, transaction_count, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, periode_start, periode_end, tipe_laporan, total_pemasukan || 0, total_pengeluaran || 0, saldo_akhir || 0, JSON.stringify(report_data || {}), data_source, transaction_count, created_by]
        );

        const [rows] = await pool.execute(
            'SELECT * FROM financial_reports WHERE id = ?',
            [id]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: `Gagal menyimpan laporan: ${error.message}` });
    }
});

// Delete report
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute(
            'SELECT id FROM financial_reports WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan' });
        }

        await pool.execute('DELETE FROM financial_reports WHERE id = ?', [id]);
        res.json({ message: 'Laporan berhasil dihapus' });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ error: 'Gagal menghapus laporan' });
    }
});

export default router;
