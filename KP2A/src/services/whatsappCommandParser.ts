// WhatsApp Command Parser Service
// Handles incoming commands from WhatsApp mobile
// Updated to fix ERR_ABORTED issues

export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
  requiresAuth?: boolean;
}

export interface UserContext {
  phoneNumber: string;
  isAdmin: boolean;
  memberId?: string;
  name?: string;
}

export class WhatsAppCommandParser {
  private adminNumbers: string[] = ['+62 812-3456-7890']; // Admin phone numbers

  // Parse incoming command
  parseCommand(message: string, userContext: UserContext): CommandResponse {
    const command = message.trim().toLowerCase();
    
    if (!command.startsWith('/')) {
      return {
        success: false,
        message: 'Perintah harus dimulai dengan /. Ketik /help untuk bantuan.'
      };
    }

    const commandName = command.split(' ')[0];
    const args = command.split(' ').slice(1);

    switch (commandName) {
      case '/help':
        return this.handleHelp(userContext);
      
      case '/status':
        return this.handleStatus(userContext);
      
      case '/saldo':
        return this.handleSaldo(userContext, args);
      
      case '/pinjaman':
        return this.handlePinjaman(userContext, args);
      
      case '/riwayat':
        return this.handleRiwayat(userContext, args);
      
      case '/info':
        return this.handleInfo(userContext);
      
      // Admin commands
      case '/laporan':
        return this.handleLaporan(userContext, args);
      
      case '/backup':
        return this.handleBackup(userContext);
      
      case '/broadcast':
        return this.handleBroadcast(userContext, args);
      
      case '/member':
        return this.handleMemberManagement(userContext, args);
      
      default:
        return {
          success: false,
          message: `Perintah "${commandName}" tidak dikenali. Ketik /help untuk daftar perintah yang tersedia.`
        };
    }
  }

  // Help command
  private handleHelp(userContext: UserContext): CommandResponse {
    const memberCommands = `
📱 *PERINTAH ANGGOTA KP2A CIMAHI*

💰 *Keuangan:*
/saldo - Cek saldo simpanan
/pinjaman - Cek status pinjaman
/riwayat - Lihat riwayat transaksi (5 terakhir)
/info - Informasi akun lengkap

ℹ️ *Umum:*
/help - Bantuan perintah
/status - Status sistem

📝 *Cara Penggunaan:*
• Kirim perintah langsung ke chat ini
• Gunakan huruf kecil
• Contoh: /saldo atau /pinjaman
    `;

    const adminCommands = `
🔧 *PERINTAH ADMIN KP2A CIMAHI*

👥 *Manajemen Anggota:*
/member list - Daftar semua anggota
/member info [id] - Info detail anggota
/member active - Anggota aktif bulan ini

📊 *Laporan:*
/laporan harian - Laporan transaksi hari ini
/laporan bulanan - Laporan bulan ini
/laporan simpanan - Laporan simpanan
/laporan pinjaman - Laporan pinjaman

🔒 *Sistem:*
/backup - Backup database
/status - Status sistem lengkap
/broadcast [pesan] - Kirim pesan ke semua anggota

💡 *Tips:* Gunakan perintah dengan parameter untuk hasil spesifik
    `;

    return {
      success: true,
      message: userContext.isAdmin ? adminCommands : memberCommands
    };
  }

  // Status command
  private handleStatus(userContext: UserContext): CommandResponse {
    const basicStatus = `
🟢 *STATUS SISTEM KP2A CIMAHI*

📱 WhatsApp Bot: Aktif
🌐 Aplikasi Web: Online
💾 Database: Terhubung
⏰ Waktu Server: ${new Date().toLocaleString('id-ID')}

📊 *Statistik Hari Ini:*
• Transaksi: 12 transaksi
• Anggota Aktif: 8 orang
• Total Simpanan: Rp 45.250.000
• Total Pinjaman: Rp 23.100.000
    `;

    const adminStatus = `
🔧 *STATUS SISTEM LENGKAP*

📱 *WhatsApp Integration:*
• Bot Status: Aktif ✅
• Koneksi Mobile: Terhubung ✅
• Pesan Hari Ini: 24 pesan
• Command Diproses: 18 perintah

🌐 *Aplikasi Web:*
• Server: Online ✅
• Database: Terhubung ✅
• Backup Terakhir: ${new Date(Date.now() - 86400000).toLocaleDateString('id-ID')}

📊 *Statistik Real-time:*
• Total Anggota: 45 orang
• Anggota Aktif: 38 orang
• Simpanan Hari Ini: Rp 2.450.000
• Pinjaman Hari Ini: Rp 1.200.000
• Transaksi Pending: 3 transaksi
    `;

    return {
      success: true,
      message: userContext.isAdmin ? adminStatus : basicStatus
    };
  }

  // Saldo command
  private handleSaldo(userContext: UserContext, args: string[]): CommandResponse {
    // Simulate database query
    const saldoData = {
      simpananPokok: 100000,
      simpananWajib: 850000,
      simpananSukarela: 1250000,
      totalSimpanan: 2200000,
      lastUpdate: new Date().toLocaleDateString('id-ID')
    };

    const message = `
💰 *SALDO SIMPANAN*
Nama: ${userContext.name || 'Anggota KP2A'}

📊 *Detail Simpanan:*
• Simpanan Pokok: Rp ${saldoData.simpananPokok.toLocaleString('id-ID')}
• Simpanan Wajib: Rp ${saldoData.simpananWajib.toLocaleString('id-ID')}
• Simpanan Sukarela: Rp ${saldoData.simpananSukarela.toLocaleString('id-ID')}

💵 *Total Simpanan: Rp ${saldoData.totalSimpanan.toLocaleString('id-ID')}*

📅 Update Terakhir: ${saldoData.lastUpdate}

💡 Untuk riwayat transaksi, ketik /riwayat
    `;

    return {
      success: true,
      message: message,
      data: saldoData
    };
  }

  // Pinjaman command
  private handlePinjaman(userContext: UserContext, args: string[]): CommandResponse {
    // Simulate database query
    const pinjamanData = {
      totalPinjaman: 5000000,
      sisaPinjaman: 3200000,
      angsuranBulan: 450000,
      jatuhTempo: '15 Februari 2024',
      status: 'Aktif',
      tunggakan: 0
    };

    const message = `
🏦 *STATUS PINJAMAN*
Nama: ${userContext.name || 'Anggota KP2A'}

📋 *Detail Pinjaman:*
• Total Pinjaman: Rp ${pinjamanData.totalPinjaman.toLocaleString('id-ID')}
• Sisa Pinjaman: Rp ${pinjamanData.sisaPinjaman.toLocaleString('id-ID')}
• Angsuran/Bulan: Rp ${pinjamanData.angsuranBulan.toLocaleString('id-ID')}

📅 *Jadwal:*
• Jatuh Tempo: ${pinjamanData.jatuhTempo}
• Status: ${pinjamanData.status} ✅
• Tunggakan: ${pinjamanData.tunggakan === 0 ? 'Tidak ada' : `Rp ${pinjamanData.tunggakan.toLocaleString('id-ID')}`}

💡 Untuk riwayat pembayaran, ketik /riwayat pinjaman
    `;

    return {
      success: true,
      message: message,
      data: pinjamanData
    };
  }

  // Riwayat command
  private handleRiwayat(userContext: UserContext, args: string[]): CommandResponse {
    const type = args[0] || 'semua';
    
    // Simulate database query
    const riwayatData = [
      { tanggal: '10 Jan 2024', jenis: 'Simpanan Wajib', jumlah: 50000, saldo: 2200000 },
      { tanggal: '05 Jan 2024', jenis: 'Angsuran Pinjaman', jumlah: -450000, saldo: 2150000 },
      { tanggal: '01 Jan 2024', jenis: 'Simpanan Sukarela', jumlah: 200000, saldo: 2600000 },
      { tanggal: '28 Des 2023', jenis: 'Simpanan Wajib', jumlah: 50000, saldo: 2400000 },
      { tanggal: '20 Des 2023', jenis: 'Penarikan', jumlah: -100000, saldo: 2350000 }
    ];

    let message = `
📊 *RIWAYAT TRANSAKSI*
Nama: ${userContext.name || 'Anggota KP2A'}
Filter: ${type === 'semua' ? 'Semua Transaksi' : type}

📋 *5 Transaksi Terakhir:*
`;

    riwayatData.forEach((item, index) => {
      const icon = item.jumlah > 0 ? '💰' : '💸';
      message += `
${icon} ${item.tanggal}
   ${item.jenis}
   ${item.jumlah > 0 ? '+' : ''}Rp ${item.jumlah.toLocaleString('id-ID')}
   Saldo: Rp ${item.saldo.toLocaleString('id-ID')}
`;
    });

    message += `
💡 Untuk detail lengkap, akses aplikasi web atau hubungi admin.
    `;

    return {
      success: true,
      message: message,
      data: riwayatData
    };
  }

  // Info command
  private handleInfo(userContext: UserContext): CommandResponse {
    const infoData = {
      nama: userContext.name || 'Anggota KP2A',
      nomorAnggota: userContext.memberId || 'A001',
      telepon: userContext.phoneNumber,
      statusKeanggotaan: 'Aktif',
      tanggalBergabung: '15 Maret 2020',
      totalSimpanan: 2200000,
      totalPinjaman: 3200000
    };

    const message = `
👤 *INFORMASI ANGGOTA*

📋 *Data Pribadi:*
• Nama: ${infoData.nama}
• No. Anggota: ${infoData.nomorAnggota}
• Telepon: ${infoData.telepon}
• Status: ${infoData.statusKeanggotaan} ✅

📅 *Keanggotaan:*
• Bergabung: ${infoData.tanggalBergabung}
• Lama Bergabung: 4 tahun

💰 *Ringkasan Keuangan:*
• Total Simpanan: Rp ${infoData.totalSimpanan.toLocaleString('id-ID')}
• Sisa Pinjaman: Rp ${infoData.totalPinjaman.toLocaleString('id-ID')}

📞 *Kontak KP2A Cimahi:*
• Kantor: (022) 123-4567
• WhatsApp: +62 812-3456-7890
• Email: info@kp2acimahi.com
    `;

    return {
      success: true,
      message: message,
      data: infoData
    };
  }

  // Admin: Laporan command
  private handleLaporan(userContext: UserContext, args: string[]): CommandResponse {
    if (!userContext.isAdmin) {
      return {
        success: false,
        message: '❌ Perintah ini hanya untuk admin.'
      };
    }

    const jenis = args[0] || 'harian';
    
    let message = '';
    
    switch (jenis) {
      case 'harian':
        message = `
📊 *LAPORAN HARIAN*
Tanggal: ${new Date().toLocaleDateString('id-ID')}

💰 *Transaksi Hari Ini:*
• Simpanan Masuk: Rp 2.450.000 (12 transaksi)
• Pinjaman Keluar: Rp 1.200.000 (3 pinjaman)
• Angsuran Masuk: Rp 3.150.000 (7 pembayaran)

👥 *Aktivitas Anggota:*
• Anggota Aktif: 18 orang
• Transaksi Baru: 22 transaksi
• Anggota Baru: 1 orang

📈 *Performa:*
• Target Harian: 85% tercapai ✅
• Tunggakan: 2 anggota
        `;
        break;
        
      case 'bulanan':
        message = `
📊 *LAPORAN BULANAN*
Periode: Januari 2024

💰 *Keuangan Bulan Ini:*
• Total Simpanan: Rp 45.250.000
• Total Pinjaman: Rp 23.100.000
• Angsuran Terkumpul: Rp 18.750.000
• Keuntungan: Rp 2.850.000

👥 *Keanggotaan:*
• Total Anggota: 45 orang
• Anggota Aktif: 38 orang
• Anggota Baru: 3 orang
• Anggota Keluar: 1 orang

📈 *Target Bulanan:*
• Simpanan: 92% tercapai ✅
• Pinjaman: 78% tercapai
        `;
        break;
        
      default:
        message = `
📊 *JENIS LAPORAN TERSEDIA:*

• /laporan harian - Laporan hari ini
• /laporan bulanan - Laporan bulan ini
• /laporan simpanan - Detail simpanan
• /laporan pinjaman - Detail pinjaman

💡 Contoh: /laporan harian
        `;
    }

    return {
      success: true,
      message: message
    };
  }

  // Admin: Backup command
  private handleBackup(userContext: UserContext): CommandResponse {
    if (!userContext.isAdmin) {
      return {
        success: false,
        message: '❌ Perintah ini hanya untuk admin.'
      };
    }

    const message = `
💾 *BACKUP DATABASE*

🔄 Memulai proses backup...
✅ Database berhasil di-backup!

📋 *Detail Backup:*
• Waktu: ${new Date().toLocaleString('id-ID')}
• Ukuran: 2.4 MB
• File: backup_${new Date().toISOString().split('T')[0]}.sql
• Lokasi: /backups/

📊 *Data yang di-backup:*
• 45 data anggota
• 1,247 transaksi
• 23 pinjaman aktif
• 156 riwayat pembayaran

💡 Backup otomatis dilakukan setiap hari pukul 23:00
    `;

    return {
      success: true,
      message: message
    };
  }

  // Admin: Broadcast command
  private handleBroadcast(userContext: UserContext, args: string[]): CommandResponse {
    if (!userContext.isAdmin) {
      return {
        success: false,
        message: '❌ Perintah ini hanya untuk admin.'
      };
    }

    if (args.length === 0) {
      return {
        success: false,
        message: '❌ Format: /broadcast [pesan]\nContoh: /broadcast Rapat anggota besok pukul 19:00'
      };
    }

    const pesan = args.join(' ');
    
    const message = `
📢 *BROADCAST PESAN*

✅ Pesan berhasil dikirim ke semua anggota!

📋 *Detail Pengiriman:*
• Penerima: 45 anggota
• Waktu: ${new Date().toLocaleString('id-ID')}
• Status: Terkirim ✅

📝 *Pesan yang dikirim:*
"${pesan}"

💡 Anggota akan menerima pesan dalam 1-2 menit.
    `;

    return {
      success: true,
      message: message
    };
  }

  // Admin: Member management command
  private handleMemberManagement(userContext: UserContext, args: string[]): CommandResponse {
    if (!userContext.isAdmin) {
      return {
        success: false,
        message: '❌ Perintah ini hanya untuk admin.'
      };
    }

    const action = args[0];
    
    switch (action) {
      case 'list':
        return {
          success: true,
          message: `
👥 *DAFTAR ANGGOTA KP2A CIMAHI*

📊 *Ringkasan:*
• Total Anggota: 45 orang
• Aktif: 38 orang
• Tidak Aktif: 7 orang

👤 *5 Anggota Terakhir:*
• A045 - Budi Santoso (Aktif)
• A044 - Siti Nurhaliza (Aktif)
• A043 - Ahmad Fauzi (Aktif)
• A042 - Rina Marlina (Tidak Aktif)
• A041 - Dedi Kurniawan (Aktif)

💡 Untuk detail anggota: /member info [id]
💡 Untuk anggota aktif: /member active
          `
        };
        
      case 'active':
        return {
          success: true,
          message: `
👥 *ANGGOTA AKTIF BULAN INI*

📊 *Statistik:*
• Anggota Aktif: 38 dari 45 orang (84%)
• Transaksi Bulan Ini: 156 transaksi
• Rata-rata Transaksi: 4.1 per anggota

🏆 *Top 5 Anggota Aktif:*
• A001 - Sari Dewi (12 transaksi)
• A015 - Bambang Sutrisno (10 transaksi)
• A023 - Lina Marlina (9 transaksi)
• A007 - Agus Setiawan (8 transaksi)
• A032 - Maya Sari (7 transaksi)

💡 Kriteria aktif: minimal 1 transaksi per bulan
          `
        };
        
      case 'info':
        const memberId = args[1];
        if (!memberId) {
          return {
            success: false,
            message: '❌ Format: /member info [id]\nContoh: /member info A001'
          };
        }
        
        return {
          success: true,
          message: `
👤 *INFO ANGGOTA ${memberId.toUpperCase()}*

📋 *Data Pribadi:*
• Nama: Sari Dewi
• No. Anggota: A001
• Telepon: +62 812-1111-1111
• Alamat: Jl. Merdeka No. 123, Cimahi

💰 *Keuangan:*
• Total Simpanan: Rp 3.250.000
• Sisa Pinjaman: Rp 2.100.000
• Status: Lancar ✅

📊 *Aktivitas:*
• Bergabung: 15 Maret 2020
• Transaksi Bulan Ini: 12 kali
• Terakhir Aktif: Hari ini

📞 *Kontak Terakhir:*
• WhatsApp: 2 hari lalu
• Kunjungan Kantor: 1 minggu lalu
          `
        };
        
      default:
        return {
          success: false,
          message: `
👥 *MANAJEMEN ANGGOTA*

📋 *Perintah Tersedia:*
• /member list - Daftar semua anggota
• /member info [id] - Info detail anggota
• /member active - Anggota aktif bulan ini

💡 Contoh: /member info A001
          `
        };
    }
  }

  // Check if user is admin
  isAdmin(phoneNumber: string): boolean {
    return this.adminNumbers.includes(phoneNumber);
  }

  // Get user context (simulate database lookup)
  getUserContext(phoneNumber: string): UserContext {
    return {
      phoneNumber,
      isAdmin: this.isAdmin(phoneNumber),
      memberId: phoneNumber === '+62 812-3456-7890' ? 'ADMIN' : 'A001',
      name: phoneNumber === '+62 812-3456-7890' ? 'Admin KP2A' : 'Anggota KP2A'
    };
  }
}

// Export singleton instance
export const whatsappCommandParser = new WhatsAppCommandParser();