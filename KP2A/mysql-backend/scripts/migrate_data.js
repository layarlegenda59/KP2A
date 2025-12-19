// Data Migration Script: Supabase to MySQL
// Run with: node scripts/migrate_data.js

import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root project
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Supabase config from frontend env vars
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// MySQL config
const MYSQL_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sidarsih',
    password: process.env.DB_PASSWORD || 'sidarsih123',
    database: process.env.DB_NAME || 'sidarsih',
};

console.log('🔧 Migration Configuration:');
console.log('   Supabase URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('   MySQL Host:', MYSQL_CONFIG.host);
console.log('   MySQL Database:', MYSQL_CONFIG.database);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials not found!');
    console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env or .env.local');
    process.exit(1);
}

// Create clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let mysqlPool;

async function connectMySQL() {
    try {
        mysqlPool = await mysql.createPool(MYSQL_CONFIG);
        console.log('✅ Connected to MySQL');
        return true;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        return false;
    }
}

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('members').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Connected to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
}

// Migration functions for each table
async function migrateMembers() {
    console.log('\n📦 Migrating members...');

    const { data: members, error } = await supabase
        .from('members')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching members:', error.message);
        return 0;
    }

    if (!members || members.length === 0) {
        console.log('   ⚠️ No members to migrate');
        return 0;
    }

    let migrated = 0;
    for (const member of members) {
        try {
            await mysqlPool.execute(
                `INSERT INTO members (id, id_anggota, nama_lengkap, nik, alamat, no_hp, status_keanggotaan, tanggal_masuk, jabatan, foto, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), alamat = VALUES(alamat), no_hp = VALUES(no_hp)`,
                [
                    member.id,
                    member.id_anggota || null,
                    member.nama_lengkap,
                    member.nik || '',
                    member.alamat || '',
                    member.no_hp || '',
                    member.status_keanggotaan || 'aktif',
                    member.tanggal_masuk || new Date().toISOString().split('T')[0],
                    member.jabatan || 'Anggota',
                    member.foto || null,
                    member.created_at || new Date(),
                    member.updated_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating member ${member.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${members.length} members`);
    return migrated;
}

async function migrateDues() {
    console.log('\n📦 Migrating dues...');

    const { data: dues, error } = await supabase
        .from('dues')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching dues:', error.message);
        return 0;
    }

    if (!dues || dues.length === 0) {
        console.log('   ⚠️ No dues to migrate');
        return 0;
    }

    let migrated = 0;
    for (const due of dues) {
        try {
            await mysqlPool.execute(
                `INSERT INTO dues (id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, tanggal_bayar, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE iuran_wajib = VALUES(iuran_wajib), iuran_sukarela = VALUES(iuran_sukarela)`,
                [
                    due.id,
                    due.member_id,
                    due.bulan,
                    due.tahun,
                    due.iuran_wajib || 0,
                    due.iuran_sukarela || 0,
                    due.tanggal_bayar || new Date().toISOString().split('T')[0],
                    due.status || 'lunas',
                    due.created_at || new Date(),
                    due.updated_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating due ${due.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${dues.length} dues`);
    return migrated;
}

async function migrateLoans() {
    console.log('\n📦 Migrating loans...');

    const { data: loans, error } = await supabase
        .from('loans')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching loans:', error.message);
        return 0;
    }

    if (!loans || loans.length === 0) {
        console.log('   ⚠️ No loans to migrate');
        return 0;
    }

    let migrated = 0;
    for (const loan of loans) {
        try {
            await mysqlPool.execute(
                `INSERT INTO loans (id, member_id, jumlah_pinjaman, bunga_persen, tenor_bulan, angsuran_bulanan, tanggal_pinjaman, status, sisa_pinjaman, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), sisa_pinjaman = VALUES(sisa_pinjaman)`,
                [
                    loan.id,
                    loan.member_id,
                    loan.jumlah_pinjaman || 0,
                    loan.bunga_persen || 0,
                    loan.tenor_bulan || 12,
                    loan.angsuran_bulanan || 0,
                    loan.tanggal_pinjaman || new Date().toISOString().split('T')[0],
                    loan.status || 'aktif',
                    loan.sisa_pinjaman || loan.jumlah_pinjaman || 0,
                    loan.created_at || new Date(),
                    loan.updated_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating loan ${loan.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${loans.length} loans`);
    return migrated;
}

async function migrateLoanPayments() {
    console.log('\n📦 Migrating loan payments...');

    const { data: payments, error } = await supabase
        .from('loan_payments')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching loan payments:', error.message);
        return 0;
    }

    if (!payments || payments.length === 0) {
        console.log('   ⚠️ No loan payments to migrate');
        return 0;
    }

    let migrated = 0;
    for (const payment of payments) {
        try {
            await mysqlPool.execute(
                `INSERT INTO loan_payments (id, loan_id, angsuran_ke, angsuran_pokok, angsuran_bunga, total_angsuran, tanggal_bayar, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [
                    payment.id,
                    payment.loan_id,
                    payment.angsuran_ke || 1,
                    payment.angsuran_pokok || 0,
                    payment.angsuran_bunga || 0,
                    payment.total_angsuran || 0,
                    payment.tanggal_bayar || new Date().toISOString().split('T')[0],
                    payment.status || 'lunas',
                    payment.created_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating payment ${payment.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${payments.length} loan payments`);
    return migrated;
}

async function migrateExpenses() {
    console.log('\n📦 Migrating expenses...');

    const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching expenses:', error.message);
        return 0;
    }

    if (!expenses || expenses.length === 0) {
        console.log('   ⚠️ No expenses to migrate');
        return 0;
    }

    let migrated = 0;
    for (const expense of expenses) {
        try {
            // Map old schema fields to new schema
            const kategori = expense.kategori || expense.category_name || 'Umum';
            const deskripsi = expense.deskripsi || expense.notes || '';
            const jumlah = expense.jumlah || expense.amount || 0;
            const tanggal = expense.tanggal || expense.payment_date || new Date().toISOString().split('T')[0];
            const status = expense.status_otorisasi || expense.status || 'approved';

            await mysqlPool.execute(
                `INSERT INTO expenses (id, kategori, deskripsi, jumlah, tanggal, bukti_pengeluaran, status_otorisasi, created_by, authorized_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE jumlah = VALUES(jumlah), status_otorisasi = VALUES(status_otorisasi)`,
                [
                    expense.id,
                    kategori,
                    deskripsi,
                    jumlah,
                    tanggal,
                    expense.bukti_pengeluaran || null,
                    status,
                    expense.created_by || 'system',
                    expense.authorized_by || null,
                    expense.created_at || new Date(),
                    expense.updated_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating expense ${expense.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${expenses.length} expenses`);
    return migrated;
}

async function migrateUsers() {
    console.log('\n📦 Migrating users...');

    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error('   ❌ Error fetching users:', error.message);
        return 0;
    }

    if (!users || users.length === 0) {
        console.log('   ⚠️ No users to migrate');
        return 0;
    }

    let migrated = 0;
    for (const user of users) {
        try {
            // Skip if no password hash (can't login anyway)
            const passwordHash = user.password_hash || user.encrypted_password || '$2a$10$placeholder';

            await mysqlPool.execute(
                `INSERT INTO users (id, email, password_hash, role, member_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE role = VALUES(role), member_id = VALUES(member_id)`,
                [
                    user.id,
                    user.email,
                    passwordHash,
                    user.role || 'anggota',
                    user.member_id || null,
                    user.created_at || new Date(),
                    user.updated_at || new Date()
                ]
            );
            migrated++;
        } catch (err) {
            console.error(`   ❌ Error migrating user ${user.id}:`, err.message);
        }
    }

    console.log(`   ✅ Migrated ${migrated}/${users.length} users`);
    return migrated;
}

async function main() {
    console.log('🚀 Starting Supabase to MySQL Data Migration\n');
    console.log('='.repeat(50));

    // Test connections
    const supabaseOk = await testSupabaseConnection();
    const mysqlOk = await connectMySQL();

    if (!supabaseOk || !mysqlOk) {
        console.error('\n❌ Migration aborted due to connection errors');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Starting data migration...');

    // Run migrations
    const results = {
        members: await migrateMembers(),
        dues: await migrateDues(),
        loans: await migrateLoans(),
        loanPayments: await migrateLoanPayments(),
        expenses: await migrateExpenses(),
        users: await migrateUsers(),
    };

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('   Members:', results.members, 'records');
    console.log('   Dues:', results.dues, 'records');
    console.log('   Loans:', results.loans, 'records');
    console.log('   Loan Payments:', results.loanPayments, 'records');
    console.log('   Expenses:', results.expenses, 'records');
    console.log('   Users:', results.users, 'records');
    console.log('='.repeat(50));

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`\n✅ Migration completed! Total records: ${total}`);

    await mysqlPool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
