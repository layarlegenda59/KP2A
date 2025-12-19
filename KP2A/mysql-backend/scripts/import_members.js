// Import Members from CSV to MySQL
// Run with: node scripts/import_members.js

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MySQL config
const MYSQL_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'sidarsih',
    password: process.env.DB_PASSWORD || 'sidarsih123',
    database: process.env.DB_NAME || 'sidarsih',
};

async function main() {
    console.log('🚀 Starting Members Import from CSV\n');

    // Read CSV file
    const csvPath = path.join(__dirname, '../members_rows.csv');
    console.log('📂 Reading CSV from:', csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found:', csvPath);
        process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
    });

    console.log(`📊 Found ${records.length} members to import\n`);

    // Connect to MySQL
    let pool;
    try {
        pool = await mysql.createPool(MYSQL_CONFIG);
        console.log('✅ Connected to MySQL\n');
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        process.exit(1);
    }

    // Import members
    let imported = 0;
    let errors = 0;

    for (const member of records) {
        try {
            // Parse dates properly
            const createdAt = member.created_at ? new Date(member.created_at.replace('+00', 'Z')) : new Date();
            const updatedAt = member.updated_at ? new Date(member.updated_at.replace('+00', 'Z')) : new Date();
            const tanggalMasuk = member.tanggal_masuk || new Date().toISOString().split('T')[0];

            await pool.execute(
                `INSERT INTO members (id, id_anggota, nama_lengkap, nik, alamat, no_hp, status_keanggotaan, tanggal_masuk, jabatan, foto, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    nama_lengkap = VALUES(nama_lengkap), 
                    alamat = VALUES(alamat), 
                    no_hp = VALUES(no_hp),
                    status_keanggotaan = VALUES(status_keanggotaan),
                    id_anggota = VALUES(id_anggota),
                    updated_at = VALUES(updated_at)`,
                [
                    member.id,
                    member.id_anggota || null,
                    member.nama_lengkap,
                    member.nik || '',
                    member.alamat || '',
                    member.no_hp || '',
                    member.status_keanggotaan || 'aktif',
                    tanggalMasuk,
                    member.jabatan || 'Anggota',
                    member.foto || null,
                    createdAt,
                    updatedAt
                ]
            );
            imported++;
            console.log(`   ✅ Imported: ${member.nama_lengkap}`);
        } catch (err) {
            errors++;
            console.error(`   ❌ Error importing ${member.nama_lengkap}:`, err.message);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successfully imported: ${imported}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(50));

    await pool.end();
    console.log('\n✅ Import completed!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
});
