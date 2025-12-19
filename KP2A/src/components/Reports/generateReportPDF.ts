import { jsPDF } from 'jspdf';

interface ReportData {
    id: string;
    periode_start: string;
    periode_end: string;
    tipe_laporan: 'bulanan' | 'triwulan' | 'tahunan';
    total_pemasukan: number;
    total_pengeluaran: number;
    saldo_akhir: number;
    report_data?: {
        uang_masuk?: {
            iuran_wajib?: number;
            simpanan_sukarela?: number;
            simpanan_wajib?: number;
            angsuran_pinjaman?: number;
            donasi?: number;
            total?: number;
        };
        uang_keluar?: {
            pinjaman_ke_anggota?: number;
            pengeluaran_operasional?: number;
            total?: number;
        };
        ringkasan?: {
            total_uang_masuk?: number;
            total_uang_keluar?: number;
            saldo_akhir?: number;
        };
        neraca?: {
            harta?: {
                kas_bank?: number;
                piutang_pinjaman?: number;
                total?: number;
            };
            kewajiban?: {
                simpanan_wajib?: number;
                simpanan_sukarela?: number;
                total?: number;
            };
            modal?: {
                iuran_wajib?: number;
                shu?: number;
                total?: number;
            };
            total_kewajiban_modal?: number;
        };
    };
}

// Format currency with Rp
const formatRupiah = (amount: number): string => {
    const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));

    if (amount < 0) {
        return `(Rp ${formatted})`;
    }
    return `Rp ${formatted}`;
};

// Format date in Indonesian
const formatDateIndonesian = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

// Get period label
const getPeriodLabel = (tipe: string): string => {
    switch (tipe) {
        case 'bulanan': return 'Bulanan';
        case 'triwulan': return 'Triwulan';
        case 'tahunan': return 'Tahunan';
        default: return tipe;
    }
};

export const generateReportPDF = async (report: ReportData, logoUrl?: string): Promise<void> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Colors
    const primaryColor: [number, number, number] = [30, 58, 138]; // Blue-900
    const lightGray: [number, number, number] = [245, 245, 245];
    const darkGray: [number, number, number] = [100, 100, 100];

    // Get data
    const data = report.report_data || {};
    const uangMasuk = data.uang_masuk || {};
    const uangKeluar = data.uang_keluar || {};
    const ringkasan = data.ringkasan || {};
    const neraca = data.neraca || {};

    // ==================== PAGE 1: LAPORAN KEUANGAN ====================
    let yPos = margin;

    // Logo
    if (logoUrl) {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = logoUrl;
            });
            const logoWidth = 25;
            const logoHeight = 25;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.addImage(img, 'PNG', logoX, yPos, logoWidth, logoHeight);
            yPos += logoHeight + 8;
        } catch {
            yPos += 5;
        }
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('LAPORAN KEUANGAN', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    doc.setFontSize(14);
    doc.text('KP2A CIMAHI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Period
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const periodText = `Periode ${getPeriodLabel(report.tipe_laporan)}: ${formatDateIndonesian(report.periode_start)} s/d ${formatDateIndonesian(report.periode_end)}`;
    doc.text(periodText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Helper function to draw section
    const drawSection = (title: string, items: { label: string; value: number }[], showTotal: boolean = true) => {
        // Section header
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, yPos + 5.5);
        yPos += 8;

        // Section items
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        let total = 0;
        items.forEach((item, index) => {
            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(...lightGray);
                doc.rect(margin, yPos, contentWidth, 7, 'F');
            }
            doc.text(`    ${item.label}`, margin + 3, yPos + 5);
            doc.text(formatRupiah(item.value), margin + contentWidth - 3, yPos + 5, { align: 'right' });
            total += item.value;
            yPos += 7;
        });

        // Total row
        if (showTotal && items.length > 1) {
            doc.setFillColor(220, 220, 220);
            doc.rect(margin, yPos, contentWidth, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(`    TOTAL ${title}`, margin + 3, yPos + 5);
            doc.text(formatRupiah(total), margin + contentWidth - 3, yPos + 5, { align: 'right' });
            yPos += 7;
        }

        yPos += 3;
    };

    // A. UANG MASUK
    drawSection('A. UANG MASUK', [
        { label: 'Iuran Wajib Anggota', value: uangMasuk.iuran_wajib || 0 },
        { label: 'Simpanan Sukarela', value: uangMasuk.simpanan_sukarela || 0 },
        { label: 'Simpanan Wajib', value: uangMasuk.simpanan_wajib || 0 },
        { label: 'Angsuran Pinjaman', value: uangMasuk.angsuran_pinjaman || 0 },
        { label: 'Donasi', value: uangMasuk.donasi || 0 },
    ]);

    // B. UANG KELUAR
    drawSection('B. UANG KELUAR', [
        { label: 'Pinjaman ke Anggota', value: uangKeluar.pinjaman_ke_anggota || 0 },
        { label: 'Pengeluaran Operasional', value: uangKeluar.pengeluaran_operasional || 0 },
    ]);

    // C. RINGKASAN
    yPos += 5;
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('C. RINGKASAN', margin + 3, yPos + 5.5);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Total Uang Masuk
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text('    Total Uang Masuk', margin + 3, yPos + 5);
    doc.text(formatRupiah(ringkasan.total_uang_masuk || 0), margin + contentWidth - 3, yPos + 5, { align: 'right' });
    yPos += 7;

    // Total Uang Keluar
    doc.text('    Total Uang Keluar', margin + 3, yPos + 5);
    doc.text(formatRupiah(-(ringkasan.total_uang_keluar || 0)), margin + contentWidth - 3, yPos + 5, { align: 'right' });
    yPos += 7;

    // Saldo Akhir (highlighted)
    doc.setFillColor(200, 230, 200);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('    SALDO AKHIR', margin + 3, yPos + 5.5);
    doc.text(formatRupiah(ringkasan.saldo_akhir || 0), margin + contentWidth - 3, yPos + 5.5, { align: 'right' });
    yPos += 12;

    // ==================== D. ALOKASI DANA ====================
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('D. ALOKASI DANA', margin + 3, yPos + 5.5);
    yPos += 10;

    // Get allocation values
    const simpananTotal = (uangMasuk.simpanan_wajib || 0) + (uangMasuk.simpanan_sukarela || 0);
    const pinjamanAnggota = uangKeluar.pinjaman_ke_anggota || 0;
    const iuranWajibTotal = uangMasuk.iuran_wajib || 0;
    const operasionalTotal = uangKeluar.pengeluaran_operasional || 0;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    // Row 1: Simpanan -> Pinjaman
    const rowHeight = 18;
    const colWidth1 = 85; // Sumber
    const colWidth2 = 15; // Arrow

    // Row 1 background
    doc.setFillColor(230, 245, 255);
    doc.setDrawColor(150, 180, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, rowHeight, 'FD');

    // Row 1 content - Sumber
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 100, 150);
    doc.text('SUMBER DANA:', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Simpanan Wajib + Sukarela', margin + 3, yPos + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(simpananTotal), margin + 3, yPos + 16);

    // Row 1 - Arrow
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    const arrowX = margin + colWidth1;
    doc.line(arrowX, yPos + rowHeight / 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);
    doc.line(arrowX + colWidth2 - 6, yPos + rowHeight / 2 - 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);
    doc.line(arrowX + colWidth2 - 6, yPos + rowHeight / 2 + 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);

    // Row 1 content - Penggunaan
    const penggunaanX = margin + colWidth1 + colWidth2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 50);
    doc.text('DIGUNAKAN UNTUK:', penggunaanX, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Pinjaman ke Anggota', penggunaanX, yPos + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(pinjamanAnggota), penggunaanX, yPos + 16);

    yPos += rowHeight + 2;

    // Row 2: Iuran -> Operasional
    doc.setFillColor(255, 248, 235);
    doc.setDrawColor(220, 180, 130);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, rowHeight, 'FD');

    // Row 2 content - Sumber
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 100, 150);
    doc.text('SUMBER DANA:', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Iuran Wajib Anggota', margin + 3, yPos + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(iuranWajibTotal), margin + 3, yPos + 16);

    // Row 2 - Arrow
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.8);
    doc.line(arrowX, yPos + rowHeight / 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);
    doc.line(arrowX + colWidth2 - 6, yPos + rowHeight / 2 - 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);
    doc.line(arrowX + colWidth2 - 6, yPos + rowHeight / 2 + 2, arrowX + colWidth2 - 3, yPos + rowHeight / 2);

    // Row 2 content - Penggunaan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 50);
    doc.text('DIGUNAKAN UNTUK:', penggunaanX, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Biaya Operasional & Lainnya', penggunaanX, yPos + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(operasionalTotal), penggunaanX, yPos + 16);

    yPos += rowHeight + 3;

    // Allocation note
    doc.setFontSize(7);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'italic');
    doc.text('* Simpanan anggota digunakan sebagai modal pinjaman, Iuran Wajib untuk biaya operasional.', margin, yPos);
    yPos += 8;

    // Signature Section
    const signatureY = yPos + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Right side (date + Bendahara)
    const rightX = margin + contentWidth - 50;
    doc.text(`Cimahi, ${formatDateIndonesian(new Date().toISOString())}`, rightX, signatureY);
    doc.text('Dibuat oleh,', rightX, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text('Bendahara', rightX, signatureY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('(________________)', rightX, signatureY + 30);

    // Left side (Ketua)
    doc.text('Mengetahui,', margin, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text('Ketua KP2A Cimahi', margin, signatureY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('(________________)', margin, signatureY + 30);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text('Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ==================== PAGE 2: NERACA ====================
    doc.addPage();
    yPos = margin;

    // Logo again
    if (logoUrl) {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = logoUrl;
            });
            const logoWidth = 25;
            const logoHeight = 25;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.addImage(img, 'PNG', logoX, yPos, logoWidth, logoHeight);
            yPos += logoHeight + 8;
        } catch {
            yPos += 5;
        }
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('NERACA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    doc.setFontSize(14);
    doc.text('KP2A CIMAHI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Per ${formatDateIndonesian(report.periode_end)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // HARTA
    drawSection('HARTA (Apa yang Dimiliki)', [
        { label: 'Kas dan Bank', value: neraca.harta?.kas_bank || 0 },
        { label: 'Piutang Pinjaman Anggota', value: neraca.harta?.piutang_pinjaman || 0 },
    ]);

    // Total Harta (big highlight)
    doc.setFillColor(200, 230, 200);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL HARTA', margin + 3, yPos + 5.5);
    doc.text(formatRupiah(neraca.harta?.total || 0), margin + contentWidth - 3, yPos + 5.5, { align: 'right' });
    yPos += 15;

    // KEWAJIBAN
    drawSection('KEWAJIBAN (Yang Harus Dikembalikan ke Anggota)', [
        { label: 'Simpanan Wajib Anggota', value: neraca.kewajiban?.simpanan_wajib || 0 },
        { label: 'Simpanan Sukarela Anggota', value: neraca.kewajiban?.simpanan_sukarela || 0 },
    ]);

    // MODAL (simplified - no SHU since no interest on loans)
    drawSection('MODAL (Modal Tetap Organisasi)', [
        { label: 'Iuran Wajib Anggota', value: neraca.modal?.iuran_wajib || 0 },
    ]);

    // Total Kewajiban + Modal
    doc.setFillColor(200, 230, 200);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL KEWAJIBAN + MODAL', margin + 3, yPos + 5.5);
    doc.text(formatRupiah(neraca.total_kewajiban_modal || 0), margin + contentWidth - 3, yPos + 5.5, { align: 'right' });
    yPos += 10;

    // Balance check note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text('(Harus sama dengan Total Harta)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Signature Section for Neraca
    const signatureY2 = yPos + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Right side (date + Bendahara)
    doc.text(`Cimahi, ${formatDateIndonesian(new Date().toISOString())}`, rightX, signatureY2);
    doc.text('Dibuat oleh,', rightX, signatureY2 + 6);
    doc.setFont('helvetica', 'bold');
    doc.text('Bendahara', rightX, signatureY2 + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('(________________)', rightX, signatureY2 + 30);

    // Left side (Ketua)
    doc.text('Mengetahui,', margin, signatureY2 + 6);
    doc.setFont('helvetica', 'bold');
    doc.text('Ketua KP2A Cimahi', margin, signatureY2 + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('(________________)', margin, signatureY2 + 30);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text('Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ==================== PAGE 3: PENJELASAN & ANALISIS ====================
    doc.addPage();
    yPos = margin;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('PENJELASAN & ANALISIS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    doc.setFontSize(14);
    doc.text('KP2A CIMAHI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Section 1: Penjelasan Istilah
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('PENJELASAN ISTILAH', margin + 3, yPos + 5.5);
    yPos += 10;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const termWidth = 40;
    const descStartX = margin + termWidth + 5;

    const terms = [
        { term: 'Iuran Wajib', desc: 'Iuran bulanan tetap dari setiap anggota. Menjadi modal tetap organisasi.' },
        { term: 'Simpanan Wajib', desc: 'Simpanan rutin anggota yang BISA DITARIK saat anggota keluar.' },
        { term: 'Simpanan Sukarela', desc: 'Simpanan tambahan dari anggota yang BISA DITARIK kapan saja.' },
        { term: 'Angsuran Pinjaman', desc: 'Pembayaran cicilan dari anggota yang meminjam uang.' },
        { term: 'Piutang Pinjaman', desc: 'Sisa pinjaman anggota yang BELUM DIBAYAR (uang masih akan masuk).' },
        { term: 'SHU', desc: 'Sisa Hasil Usaha = Selisih antara pendapatan dan pengeluaran (Laba/Rugi).' },
        { term: 'Angka (Rp X)', desc: 'Angka dalam tanda kurung menunjukkan nilai MINUS atau NEGATIF.' },
    ];

    terms.forEach((item, index) => {
        if (index % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(margin, yPos, contentWidth, 7, 'F');
        }
        doc.setFont('helvetica', 'bold');
        doc.text(item.term, margin + 3, yPos + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(item.desc, descStartX, yPos + 5);
        yPos += 7;
    });

    yPos += 8;

    // Section 2: Analisis Kondisi Keuangan
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('ANALISIS KONDISI KEUANGAN', margin + 3, yPos + 5.5);
    yPos += 12;

    // Calculate analysis
    const saldoAkhir = ringkasan.saldo_akhir || 0;
    const totalHarta = neraca.harta?.total || 0;
    const totalKewajiban = neraca.kewajiban?.total || 0;
    const piutang = neraca.harta?.piutang_pinjaman || 0;

    // Helper function for analysis items
    const drawAnalysisItem = (
        number: string,
        title: string,
        status: 'good' | 'warning' | 'info',
        statusText: string,
        explanation: string
    ) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${number}. ${title}`, margin + 3, yPos);
        yPos += 7;

        // Status box
        const boxHeight = 12;
        if (status === 'good') {
            doc.setFillColor(200, 240, 200);
            doc.setDrawColor(100, 180, 100);
        } else if (status === 'warning') {
            doc.setFillColor(255, 220, 220);
            doc.setDrawColor(200, 100, 100);
        } else {
            doc.setFillColor(255, 250, 200);
            doc.setDrawColor(200, 180, 100);
        }
        doc.setLineWidth(0.5);
        doc.rect(margin + 5, yPos - 2, contentWidth - 10, boxHeight, 'FD');

        // Status label
        const labelWidth = 60;
        if (status === 'good') {
            doc.setFillColor(80, 160, 80);
        } else if (status === 'warning') {
            doc.setFillColor(200, 80, 80);
        } else {
            doc.setFillColor(180, 160, 60);
        }
        doc.rect(margin + 7, yPos, labelWidth, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        const labelText = status === 'good' ? 'BAIK' : status === 'warning' ? 'PERHATIAN' : 'INFO';
        doc.text(labelText, margin + 7 + labelWidth / 2, yPos + 5.5, { align: 'center' });

        // Status text
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(statusText, margin + 7 + labelWidth + 5, yPos + 5.5);
        yPos += boxHeight + 2;

        // Explanation
        doc.setFontSize(8);
        doc.setTextColor(...darkGray);
        doc.text(`Artinya: ${explanation}`, margin + 8, yPos);
        yPos += 10;
    };

    // 1. Status Saldo Kas
    const isDeficit = saldoAkhir < 0;
    drawAnalysisItem(
        '1',
        'Status Saldo Kas',
        isDeficit ? 'warning' : 'good',
        isDeficit
            ? `Kas bernilai MINUS ${formatRupiah(Math.abs(saldoAkhir))}`
            : `Kas bernilai POSITIF ${formatRupiah(saldoAkhir)}`,
        isDeficit
            ? 'Uang keluar lebih banyak dari uang masuk.'
            : 'Uang masuk lebih banyak dari uang keluar.'
    );

    // 2. Status Piutang Pinjaman
    const hasReceivables = piutang > 0;
    drawAnalysisItem(
        '2',
        'Status Piutang Pinjaman',
        hasReceivables ? 'info' : 'good',
        hasReceivables
            ? `Piutang anggota: ${formatRupiah(piutang)}`
            : 'Tidak ada piutang pinjaman.',
        hasReceivables
            ? 'Ada uang yang masih harus ditagih dari anggota peminjam.'
            : 'Semua pinjaman anggota sudah lunas.'
    );

    // 3. Kemampuan Bayar Simpanan
    const coverage = totalKewajiban > 0 ? totalHarta / totalKewajiban : 1;
    drawAnalysisItem(
        '3',
        'Kemampuan Membayar Simpanan Anggota',
        coverage >= 1 ? 'good' : 'warning',
        coverage >= 1
            ? `Harta ${formatRupiah(totalHarta)} >= Kewajiban ${formatRupiah(totalKewajiban)}`
            : `Harta ${formatRupiah(totalHarta)} < Kewajiban ${formatRupiah(totalKewajiban)}`,
        coverage >= 1
            ? 'Jika semua anggota menarik simpanan, KP2A mampu membayar.'
            : 'Jika semua anggota menarik simpanan, KP2A tidak mampu membayar.'
    );

    yPos += 5;

    // Section 3: Catatan Penting
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('CATATAN PENTING', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const notes = [
        '1. Neraca yang seimbang: Total Harta harus SAMA dengan Total (Kewajiban + Modal).',
        '2. Laporan ini menghitung data berdasarkan transaksi yang tercatat di sistem.',
        '3. Untuk laporan yang akurat, pastikan semua transaksi sudah diinput dengan benar.',
        '4. Jika ada pertanyaan, silakan hubungi Bendahara atau Pengurus KP2A Cimahi.',
    ];

    notes.forEach((note) => {
        doc.text(note, margin + 3, yPos);
        yPos += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text('Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...darkGray);
        doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    // Save PDF
    const fileName = `Laporan_Keuangan_KP2A_${getPeriodLabel(report.tipe_laporan)}_${report.periode_start}_${report.periode_end}.pdf`;
    doc.save(fileName);
};

export default generateReportPDF;
