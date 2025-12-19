import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import membersRoutes from './routes/members.js';
import duesRoutes from './routes/dues.js';
import loansRoutes from './routes/loans.js';
import expensesRoutes from './routes/expenses.js';
import usersRoutes from './routes/users.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:5176',
            'http://localhost:5177',
            'http://localhost:5178',
            'http://localhost:5179',
            'http://localhost:5180',
            'http://localhost:5181',
            'http://localhost:5182',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:5175',
            'http://127.0.0.1:5176',
            'http://127.0.0.1:5177',
            'http://127.0.0.1:5178',
            'http://127.0.0.1:5179',
            'https://sidarsih.site',
            'https://www.sidarsih.site',
            'https://admin.sidarsih.site',
            ...envOrigins
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const pool = (await import('./config/database.js')).default;

        const [[{ total_members }]] = await pool.execute(
            "SELECT COUNT(*) as total_members FROM members WHERE status_keanggotaan = 'aktif'"
        );

        // Iuran Bulan Ini (dari dues table)
        const [[{ total_dues }]] = await pool.execute(
            `SELECT COALESCE(SUM(iuran_wajib + COALESCE(iuran_sukarela, 0) + COALESCE(simpanan_wajib, 0)), 0) as total_dues 
             FROM dues 
             WHERE MONTH(tanggal_bayar) = MONTH(NOW()) AND YEAR(tanggal_bayar) = YEAR(NOW())`
        );

        // Pinjaman Aktif (COUNT jumlah pinjaman aktif)
        const [[{ total_loans }]] = await pool.execute(
            "SELECT COUNT(*) as total_loans FROM loans WHERE status = 'aktif'"
        );

        // Pengeluaran Bulan Ini (debit, tidak termasuk transfer internal)
        const [[{ total_expenses }]] = await pool.execute(
            `SELECT COALESCE(SUM(jumlah), 0) as total_expenses 
             FROM expenses 
             WHERE type = 'debit'
             AND LOWER(kategori) NOT LIKE '%tarik kas bank%'
             AND LOWER(kategori) NOT LIKE '%pinjaman anggota%'
             AND MONTH(tanggal) = MONTH(NOW()) AND YEAR(tanggal) = YEAR(NOW())`
        );

        res.json({
            total_members: parseInt(total_members),
            total_dues_this_month: parseFloat(total_dues),
            total_loans_active: parseInt(total_loans),
            total_expenses_this_month: parseFloat(total_expenses)
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Gagal mengambil statistik' });
    }
});

// Users management
app.get('/api/users', async (req, res) => {
    try {
        const pool = (await import('./config/database.js')).default;
        const [rows] = await pool.execute(
            `SELECT u.id, u.email, u.role, u.member_id, u.created_at, m.nama_lengkap, m.id_anggota
       FROM users u
       LEFT JOIN members m ON u.member_id = m.id
       ORDER BY u.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Gagal mengambil data users' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route tidak ditemukan' });
});

// Start server
async function start() {
    const connected = await testConnection();

    if (!connected) {
        console.error('❌ Cannot start server without database connection');
        console.log('Please run: sudo mysql < mysql/schema.sql');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`🚀 SIDARSIH MySQL Backend running on http://localhost:${PORT}`);
        console.log(`📊 API endpoints:`);
        console.log(`   - Auth: /api/auth`);
        console.log(`   - Members: /api/members`);
        console.log(`   - Dues: /api/dues`);
        console.log(`   - Loans: /api/loans`);
        console.log(`   - Expenses: /api/expenses`);
        console.log(`   - Reports: /api/reports`);
        console.log(`   - Dashboard: /api/dashboard/stats`);
    });
}

start();
