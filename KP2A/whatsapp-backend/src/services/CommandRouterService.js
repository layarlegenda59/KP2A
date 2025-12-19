/**
 * Command Router Service
 * Handles various WhatsApp commands following Google Sheets bot patterns
 * Commands: info, simpanan, pinjaman, profil, daftar, kontak, menu
 */
class CommandRouterService {
    constructor(supabaseClient, analyticsLogger) {
        this.supabase = supabaseClient;
        this.analyticsLogger = analyticsLogger;
        
        // Command mappings
        this.commands = {
            'info': this.handleInfoCommand.bind(this),
            'informasi': this.handleInfoCommand.bind(this),
            'simpanan': this.handleSimpananCommand.bind(this),
            'tabungan': this.handleSimpananCommand.bind(this),
            'saldo': this.handleSimpananCommand.bind(this),
            'pinjaman': this.handlePinjamanCommand.bind(this),
            'kredit': this.handlePinjamanCommand.bind(this),
            'loan': this.handlePinjamanCommand.bind(this),
            'profil': this.handleProfilCommand.bind(this),
            'profile': this.handleProfilCommand.bind(this),
            'data': this.handleProfilCommand.bind(this),
            'daftar': this.handleDaftarCommand.bind(this),
            'registrasi': this.handleDaftarCommand.bind(this),
            'register': this.handleDaftarCommand.bind(this),
            'kontak': this.handleKontakCommand.bind(this),
            'contact': this.handleKontakCommand.bind(this),
            'alamat': this.handleKontakCommand.bind(this),
            'menu': this.handleMenuCommand.bind(this),
            'help': this.handleMenuCommand.bind(this),
            'bantuan': this.handleMenuCommand.bind(this)
        };
    }

    /**
     * Main command handler
     * @param {string} messageText - Incoming message text
     * @param {Object} member - Member data
     * @param {string} chatId - WhatsApp chat ID
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async handleCommand(messageText, member, chatId, whatsappClient) {
        try {
            const command = this.extractCommand(messageText);
            
            if (!command) {
                await this.handleUnknownCommand(messageText, member, chatId, whatsappClient);
                return;
            }

            // Log command usage
            if (this.analyticsLogger) {
                await this.analyticsLogger.logCommandUsage(member.id, command, member.phone);
            }

            // Execute command handler
            const handler = this.commands[command];
            if (handler) {
                await handler(member, chatId, whatsappClient, messageText);
            } else {
                await this.handleUnknownCommand(messageText, member, chatId, whatsappClient);
            }

        } catch (error) {
            console.error('Error handling command:', error);
            await whatsappClient.sendMessage(
                chatId,
                { text: '❌ Maaf, terjadi kesalahan saat memproses perintah Anda. Silakan coba lagi atau ketik *menu* untuk bantuan.' }
            );
        }
    }

    /**
     * Extract command from message text
     * @param {string} messageText - Message text
     * @returns {string|null} - Extracted command or null
     */
    extractCommand(messageText) {
        const cleanText = messageText.trim().toLowerCase();
        
        // Check for exact command matches
        for (const command of Object.keys(this.commands)) {
            if (cleanText === command || cleanText.startsWith(command + ' ')) {
                return command;
            }
        }
        
        return null;
    }

    /**
     * Handle INFO command
     */
    async handleInfoCommand(member, chatId, whatsappClient) {
        const infoMessage = `
ℹ️ *INFORMASI SIDARSIH CIMAHI*

🏦 *Tentang SIDARSIH CIMAHI*
SIDARSIH (Sistem Aplikasi Dana Forum Air Bersih) adalah aplikasi digital resmi yang digagas oleh Forum KP2A Cimahi. Nikmati kemudahan layanan simpan pinjam, cek saldo, dan notifikasi otomatis langsung via WhatsApp Bot. Lebih mudah, cepat, dan transparan.

💰 *Layanan Utama:*
• Simpanan Pokok & Wajib
• Simpanan Sukarela
• Pinjaman Anggota

📊 *Keunggulan:*
• Proses cepat & mudah
• Pelayanan profesional
• Sistem digital terintegrasi

📱 *Layanan Digital:*
• WhatsApp Bot
• Mobile banking (under developed)

Ketik *menu* untuk melihat layanan lainnya.
        `.trim();

        await whatsappClient.sendMessage(chatId, { text: infoMessage });
    }

    /**
     * Handle SIMPANAN command
     */
    async handleSimpananCommand(member, chatId, whatsappClient) {
        try {
            // Get member's dues data from dues table (only paid/lunas records)
            const { data: dues, error } = await this.supabase
                .from('dues')
                .select('*')
                .eq('member_id', member.id)
                .eq('status', 'lunas')
                .order('tahun', { ascending: false })
                .order('bulan', { ascending: false });

            if (error) {
                throw error;
            }

            // Calculate total savings from all three columns
            let totalIuranWajib = 0;
            let totalIuranSukarela = 0;
            let totalSimpananWajib = 0;
            let totalSimpanan = 0;

            if (dues && dues.length > 0) {
                dues.forEach(due => {
                    const iuranWajib = parseFloat(due.iuran_wajib) || 0;
                    const iuranSukarela = parseFloat(due.iuran_sukarela) || 0;
                    const simpananWajib = parseFloat(due.simpanan_wajib) || 0;
                    
                    totalIuranWajib += iuranWajib;
                    totalIuranSukarela += iuranSukarela;
                    totalSimpananWajib += simpananWajib;
                    totalSimpanan += iuranWajib + iuranSukarela + simpananWajib;
                });
            }

            // Get recent transactions (last 3 for mobile-friendly display)
            const recentTransactions = dues?.slice(0, 3) || [];

            let simpananMessage = `💰 *INFORMASI SIMPANAN*

👤 *Anggota:* ${member.nama_lengkap || member.name}
📋 *No. Anggota:* ${member.id_anggota || member.member_number}

💵 *Total Simpanan:* ${this.formatRupiah(totalSimpanan)}

📊 *Rincian per Jenis:*
• Iuran Wajib: ${this.formatRupiah(totalIuranWajib)}
• Iuran Sukarela: ${this.formatRupiah(totalIuranSukarela)}
• Simpanan Wajib: ${this.formatRupiah(totalSimpananWajib)}`;

            // Show recent transactions (only 3 for mobile-friendly layout)
            if (recentTransactions.length > 0) {
                simpananMessage += `

📋 *Transaksi Terbaru:*`;
                recentTransactions.forEach(transaction => {
                    const bulan = transaction.bulan;
                    const tahun = transaction.tahun;
                    const tanggalBayar = this.formatDate(transaction.tanggal_bayar);
                    const iuranWajib = parseFloat(transaction.iuran_wajib) || 0;
                    const iuranSukarela = parseFloat(transaction.iuran_sukarela) || 0;
                    const simpananWajib = parseFloat(transaction.simpanan_wajib) || 0;
                    const totalTransaksi = iuranWajib + iuranSukarela + simpananWajib;
                    
                    simpananMessage += `\n• ${bulan}/${tahun} (${tanggalBayar}): ${this.formatRupiah(totalTransaksi)}`;
                });
            } else {
                simpananMessage += `

📋 *Transaksi Terbaru:*
• Belum ada data simpanan tercatat`;
            }

            simpananMessage += `

💡 *Info:* Ketik *profil* untuk detail lengkap
Ketik *menu* untuk melihat layanan lainnya.`;

            await whatsappClient.sendMessage(chatId, { text: simpananMessage.trim() });

        } catch (error) {
            console.error('Error handling simpanan command:', error);
            await whatsappClient.sendMessage(
                chatId,
                { text: '❌ Maaf, tidak dapat mengambil data simpanan saat ini. Silakan coba lagi nanti.' }
            );
        }
    }

    /**
     * Handle PINJAMAN command
     */
    async handlePinjamanCommand(member, chatId, whatsappClient) {
        try {
            console.log('Fetching loans for member:', member.id);
            
            // Validate member data
            if (!member || !member.id) {
                console.error('Invalid member data:', member);
                await whatsappClient.sendMessage(
                    chatId,
                    '❌ Data anggota tidak valid. Silakan hubungi kantor untuk bantuan.'
                );
                return;
            }
            
            // Get member's loan data with correct field names
            const { data: loans, error } = await this.supabase
                .from('loans')
                .select('*')
                .eq('member_id', member.id)
                .order('tanggal_pinjaman', { ascending: false });

            if (error) {
                console.error('Supabase error fetching loans:', error);
                
                // Handle specific database errors
                if (error.code === 'PGRST116') {
                    await whatsappClient.sendMessage(
                        chatId,
                        '❌ Tabel pinjaman tidak ditemukan. Silakan hubungi administrator.'
                    );
                } else if (error.code === 'PGRST301') {
                    await whatsappClient.sendMessage(
                        chatId,
                        '❌ Tidak memiliki akses ke data pinjaman. Silakan hubungi administrator.'
                    );
                } else {
                    throw error;
                }
                return;
            }

            console.log('Loans data retrieved:', loans);

            // Handle case when loans is null or undefined
            if (!Array.isArray(loans)) {
                console.log('No loans data or invalid format for member:', member.id);
                await whatsappClient.sendMessage(
                    chatId,
                    `
💳 *INFORMASI PINJAMAN*

👤 *Anggota:* ${member.nama_lengkap || member.name || 'Anggota'}
📋 *No. Anggota:* ${member.id_anggota || member.member_number || '-'}

✅ *Tidak ada data pinjaman*

💡 *Info:* Untuk pengajuan pinjaman baru, hubungi kantor atau ketik *kontak*
                    `.trim()
                );
                return;
            }

            const activeLoans = loans.filter(loan => loan.status === 'aktif');
            const completedLoans = loans.filter(loan => loan.status === 'lunas');
            
            const totalActiveAmount = activeLoans.reduce((sum, loan) => {
                const sisaPinjaman = parseFloat(loan.sisa_pinjaman) || 0;
                return sum + sisaPinjaman;
            }, 0);
            
            const totalLoanHistory = loans.reduce((sum, loan) => {
                const jumlahPinjaman = parseFloat(loan.jumlah_pinjaman) || 0;
                return sum + jumlahPinjaman;
            }, 0);

            const memberName = member.nama_lengkap || member.name || 'Anggota';
            const memberNumber = member.id_anggota || member.member_number || '-';

            let pinjamanMessage = `📋 *INFORMASI PINJAMAN*

👤 *Anggota:* ${memberName}
📋 *No. Anggota:* ${memberNumber}`;

            if (activeLoans.length > 0) {
                pinjamanMessage += `

🔴 *Pinjaman Aktif (${activeLoans.length}):*`;
                activeLoans.forEach(loan => {
                    const jumlahPinjaman = parseFloat(loan.jumlah_pinjaman) || 0;
                    const sisaPinjaman = parseFloat(loan.sisa_pinjaman) || 0;
                    const angsuranBulanan = parseFloat(loan.angsuran_bulanan) || 0;
                    const bungaPersen = parseFloat(loan.bunga_persen) || 0;
                    const tenorBulan = parseInt(loan.tenor_bulan) || 0;
                    
                    // Hitung cicilan yang sudah masuk
                    const cicilanSudahMasuk = jumlahPinjaman - sisaPinjaman;
                    
                    pinjamanMessage += `
• *Pinjaman:* ${this.formatRupiah(jumlahPinjaman)}
• *Cicilan Masuk:* ${this.formatRupiah(cicilanSudahMasuk)}
• *Sisa:* ${this.formatRupiah(sisaPinjaman)}
• *Jasa:* ${bungaPersen}%
• *Tenor:* ${tenorBulan} bulan
• *Tanggal:* ${this.formatDate(loan.tanggal_pinjaman)}`;
                });

                pinjamanMessage += `

💰 *Total Sisa Pinjaman:* ${this.formatRupiah(totalActiveAmount)}`;
            } else {
                pinjamanMessage += `

✅ *Tidak ada pinjaman aktif*`;
            }

            if (completedLoans.length > 0) {
                pinjamanMessage += `

📊 *Riwayat Pinjaman:*
• Total pinjaman: ${loans.length}
• Selesai: ${completedLoans.length}
• Total nilai: ${this.formatRupiah(totalLoanHistory)}`;
            }

            pinjamanMessage += `
💡 *Info:* Untuk pengajuan pinjaman baru, hubungi kantor atau ketik *kontak*
            `.trim();

            await whatsappClient.sendMessage(chatId, { text: pinjamanMessage });

        } catch (error) {
            console.error('Error handling pinjaman command:', error);
            
            // Log detailed error for debugging
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                memberId: member?.id,
                memberName: member?.nama_lengkap || member?.name
            });
            
            await whatsappClient.sendMessage(
                chatId,
                { text: '❌ Maaf, tidak dapat mengambil data pinjaman saat ini. Silakan coba lagi nanti atau hubungi kantor.' }
            );
        }
    }

    /**
     * Handle PROFIL command
     */
    async handleProfilCommand(member, chatId, whatsappClient) {
        try {
            console.log('Fetching profile data for member:', member.id);
            
            // Validate member data
            if (!member || !member.id) {
                console.error('Invalid member data:', member);
                await whatsappClient.sendMessage(
                    chatId,
                    '❌ Data anggota tidak valid. Silakan hubungi kantor untuk bantuan.'
                );
                return;
            }

            // Get comprehensive member data
            const [duesResult, loansResult] = await Promise.all([
                this.supabase
                    .from('dues')
                    .select('*')
                    .eq('member_id', member.id)
                    .eq('status', 'lunas')
                    .order('tahun', { ascending: false }),
                this.supabase
                    .from('loans')
                    .select('*')
                    .eq('member_id', member.id)
                    .order('tanggal_pinjaman', { ascending: false })
            ]);

            if (duesResult.error) {
                console.error('Error fetching dues:', duesResult.error);
                throw duesResult.error;
            }

            if (loansResult.error) {
                console.error('Error fetching loans:', loansResult.error);
                throw loansResult.error;
            }

            const dues = duesResult.data || [];
            const loans = loansResult.data || [];

            // Calculate total simpanan from dues with correct column names
            let totalIuranWajib = 0;
            let totalIuranSukarela = 0;
            let totalSimpananWajib = 0;
            let totalSimpanan = 0;

            if (dues && dues.length > 0) {
                dues.forEach(due => {
                    const iuranWajib = parseFloat(due.iuran_wajib) || 0;
                    const iuranSukarela = parseFloat(due.iuran_sukarela) || 0;
                    const simpananWajib = parseFloat(due.simpanan_wajib) || 0;
                    
                    totalIuranWajib += iuranWajib;
                    totalIuranSukarela += iuranSukarela;
                    totalSimpananWajib += simpananWajib;
                    totalSimpanan += iuranWajib + iuranSukarela + simpananWajib;
                });
            }

            // Calculate loan information with correct column names
            const activeLoans = loans.filter(loan => loan.status === 'aktif');
            const completedLoans = loans.filter(loan => loan.status === 'lunas');
            
            const totalSisaPinjaman = activeLoans.reduce((sum, loan) => {
                const sisaPinjaman = parseFloat(loan.sisa_pinjaman) || 0;
                return sum + sisaPinjaman;
            }, 0);

            const totalJumlahPinjaman = loans.reduce((sum, loan) => {
                const jumlahPinjaman = parseFloat(loan.jumlah_pinjaman) || 0;
                return sum + jumlahPinjaman;
            }, 0);

            // Format member information with correct field names
            const memberName = member.nama_lengkap || member.name || 'Anggota';
            const memberNumber = member.id_anggota || member.member_number || '-';
            const memberPhone = member.phone || 'Tidak tersedia';
            const memberEmail = member.email || 'Tidak tersedia';
            const memberStatus = member.status ? member.status.toUpperCase() : 'AKTIF';
            const joinDate = member.created_at ? this.formatDate(member.created_at) : 'Tidak tersedia';
            const lastUpdate = member.updated_at ? this.formatDate(member.updated_at) : 'Tidak tersedia';

            const profilMessage = `
👤 *PROFIL ANGGOTA*

📋 *Data Pribadi:*
• *Nama:* ${memberName}
• *No. Anggota:* ${memberNumber}
• *Telepon:* ${memberPhone}
• *Email:* ${memberEmail}
• *Status:* ${memberStatus}
• *Bergabung:* ${joinDate}

💰 *Ringkasan Keuangan:*
• *Total Simpanan:* ${this.formatRupiah(totalSimpanan)}
• *Pinjaman Aktif:* ${activeLoans.length} pinjaman
• *Sisa Pinjaman:* ${this.formatRupiah(totalSisaPinjaman)}

📊 *Rincian Simpanan:*
• *Iuran Wajib:* ${this.formatRupiah(totalIuranWajib)}
• *Iuran Sukarela:* ${this.formatRupiah(totalIuranSukarela)}
• *Simpanan Wajib:* ${this.formatRupiah(totalSimpananWajib)}

📈 *Statistik:*
• *Riwayat Simpanan:* ${dues.length} transaksi
• *Total Pinjaman:* ${loans.length} pinjaman
• *Pinjaman Selesai:* ${completedLoans.length} pinjaman
• *Total Nilai Pinjaman:* ${this.formatRupiah(totalJumlahPinjaman)}
• *Terakhir Update:* ${lastUpdate}

💡 *Layanan:* Ketik *simpanan* atau *pinjaman* untuk detail lengkap
            `.trim();

            await whatsappClient.sendMessage(chatId, { text: profilMessage });

            console.log('Profile data sent successfully for member:', member.id);

        } catch (error) {
            console.error('Error handling profil command:', error);
            
            // Handle specific database errors
            if (error.code === 'PGRST116') {
                await whatsappClient.sendMessage(
                    chatId,
                    { text: '❌ Tabel data tidak ditemukan. Silakan hubungi administrator.' }
                );
            } else if (error.code === 'PGRST301') {
                await whatsappClient.sendMessage(
                    chatId,
                    { text: '❌ Tidak memiliki akses ke data profil. Silakan hubungi administrator.' }
                );
            } else {
                await whatsappClient.sendMessage(
                    chatId,
                    { text: '❌ Maaf, tidak dapat mengambil data profil saat ini. Silakan coba lagi nanti atau hubungi kantor untuk bantuan.' }
                );
            }
        }
    }

    /**
     * Handle DAFTAR command
     */
    async handleDaftarCommand(member, chatId, whatsappClient) {
        const daftarMessage = `
📝 *INFORMASI PENDAFTARAN ANGGOTA*

📋 *Persyaratan:*
• KTP yang masih berlaku
• Iuran Wajib Rp 50.000/bulan
• Simpanan Wajib Rp 100.000/bulan

💰 *Keuntungan Menjadi Anggota:*
• Jasa simpanan kompetitif
• Akses pinjaman dengan mudah
• Layanan digital 24/7

📍 *Cara Mendaftar:*
1. Kunjungi kantor SIDARSIH CIMAHI
2. Bawa persyaratan lengkap
3. Isi formulir pendaftaran
4. Setor simpanan pokok & wajib
5. Aktivasi akun digital

📞 *Informasi Lebih Lanjut:*
Hubungi kantor atau ketik *kontak*

💡 *Catatan:* Anda sudah terdaftar sebagai anggota!
        `.trim();

        await whatsappClient.sendMessage(chatId, { text: daftarMessage });
    }

    /**
     * Handle KONTAK command
     */
    async handleKontakCommand(member, chatId, whatsappClient) {
        const kontakMessage = `
📞 *KONTAK SIDARSIH CIMAHI*

🏢 *Kantor:*
📍 Jl. Baros - Cimahi, Jawa Barat 40512

📞 *Telepon:*
• WhatsApp Admin Bot: 0831-4057-3853

📧 *Email:*
• info@sidarsih.com

🕐 *Jam Operasional:*
• Senin - Jumat: 08:00 - 17:00 WIB
• Sabtu: 08:00 - 12:00 WIB
• Minggu & Libur: Tutup
        `.trim();

        await whatsappClient.sendMessage(chatId, { text: kontakMessage });
    }

    /**
     * Handle MENU command
     */
    async handleMenuCommand(member, chatId, whatsappClient) {
        const memberName = member.nama_lengkap || member.name || 'Anggota';
        const menuMessage = `
📋 *MENU SIDARSIH CIMAHI*
👋 Halo, *${memberName}*!

🏦 *Layanan:*
• *simpanan* - Cek saldo
• *pinjaman* - Info pinjaman
• *profil* - Data anggota
• *info* - Tentang SIDARSIH
• *kontak* - Alamat kantor

🤖 *Bantuan:* *menu* | *help*

💡 Ketik kata kunci untuk akses layanan
🕐 Layanan 24/7 | Selamat menggunakan! 🚀
        `.trim();

        await whatsappClient.sendMessage(chatId, { text: menuMessage });
    }

    /**
     * Handle unknown commands with helpful suggestions
     */
    async handleUnknownCommand(messageText, member, chatId, whatsappClient) {
        console.log(`❓ Unknown command from ${member.name}: "${messageText}"`);
        
        // Check for common typos or similar commands
        const suggestions = this.getSuggestions(messageText);
        
        let unknownMessage = `👋 Halo ${member.name}!

❓ Maaf, saya tidak memahami perintah: "${messageText}"`;

        // Add suggestions if found
        if (suggestions.length > 0) {
            unknownMessage += `\n\n💡 *Mungkin maksud Anda:*`;
            suggestions.forEach(suggestion => {
                unknownMessage += `\n• *${suggestion}*`;
            });
        }

        unknownMessage += `

📋 *Perintah yang tersedia:*
• *menu* - Daftar semua layanan
• *simpanan* - Info simpanan
• *pinjaman* - Info pinjaman
• *profil* - Data anggota
• *info* - Tentang SIDARSIH CIMAHI
• *kontak* - Kontak kantor

💡 Ketik *menu* untuk melihat daftar lengkap perintah.

🤖 *Tips:* Gunakan kata kunci sederhana seperti "menu", "simpanan", atau "pinjaman".`;

        await whatsappClient.sendMessage(chatId, { text: unknownMessage.trim() });
    }

    /**
     * Get command suggestions based on input similarity
     * @param {string} input - User input
     * @returns {Array} - Array of suggested commands
     */
    getSuggestions(input) {
        const availableCommands = Object.keys(this.commands);
        const suggestions = [];
        const inputLower = input.toLowerCase().trim();
        
        // Check for partial matches
        availableCommands.forEach(command => {
            if (command.includes(inputLower) || inputLower.includes(command)) {
                suggestions.push(command);
            }
        });
        
        // Check for common typos and variations
        const commonVariations = {
            'menu': ['manu', 'mnu', 'men', 'daftar', 'list'],
            'simpanan': ['simpan', 'tabungan', 'saldo', 'uang'],
            'pinjaman': ['pinjam', 'hutang', 'kredit', 'loan'],
            'profil': ['profile', 'data', 'biodata', 'identitas'],
            'info': ['informasi', 'tentang', 'about'],
            'kontak': ['contact', 'hubungi', 'telepon', 'alamat']
        };
        
        Object.keys(commonVariations).forEach(command => {
            if (commonVariations[command].some(variation => 
                inputLower.includes(variation) || variation.includes(inputLower)
            )) {
                if (!suggestions.includes(command)) {
                    suggestions.push(command);
                }
            }
        });
        
        return suggestions.slice(0, 3); // Limit to 3 suggestions
    }

    /**
     * Format currency to Indonesian Rupiah
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency string
     */
    formatRupiah(amount) {
        if (!amount || amount === 0) return 'Rp 0';
        
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format date to Indonesian format
     * @param {string} dateString - Date string to format
     * @returns {string} - Formatted date string
     */
    formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'Format tanggal tidak valid';
        }
    }

    /**
     * Get available commands
     * @returns {Array} - List of available commands
     */
    getAvailableCommands() {
        return Object.keys(this.commands);
    }

    /**
     * Add custom command handler
     * @param {string} command - Command name
     * @param {Function} handler - Command handler function
     */
    addCommand(command, handler) {
        this.commands[command.toLowerCase()] = handler;
    }

    /**
     * Remove command handler
     * @param {string} command - Command name to remove
     */
    removeCommand(command) {
        delete this.commands[command.toLowerCase()];
    }
}

module.exports = CommandRouterService;