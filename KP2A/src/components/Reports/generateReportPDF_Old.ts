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
        periode?: {
            iuran_wajib?: number;
            simpanan_sukarela?: number;
            simpanan_wajib?: number;
            pembayaran_pinjaman?: number;
            total_pendapatan?: number;
            total_pengeluaran?: number;
            saldo_akhir?: number;
        };
        akumulasi?: {
            iuran_wajib?: number;
            simpanan_sukarela?: number;
            simpanan_wajib?: number;
            pembayaran_pinjaman?: number;
            total_pendapatan?: number;
            total_pengeluaran?: number;
            saldo_akhir?: number;
        };
    };
}

// Format currency without Rp symbol
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Format date in Indonesian
const formatDateIndonesian = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

// Get period type label
const getPeriodLabel = (tipe: string): string => {
    switch (tipe) {
        case 'bulanan': return 'BULANAN';
        case 'triwulan': return 'TRIWULAN';
        case 'tahunan': return 'TAHUNAN';
        default: return tipe.toUpperCase();
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

    let yPos = margin;

    // Helper to add logo
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
            yPos += logoHeight + 10;
        } catch (e) {
            console.warn('Failed to load logo, continuing without it');
            yPos += 5;
        }
    } else {
        yPos += 5;
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LAPORAN KEUANGAN', pageWidth / 2, yPos, { align: 'center' });

    // Underline
    const titleWidth = doc.getTextWidth('LAPORAN KEUANGAN');
    doc.setLineWidth(0.5);
    doc.line((pageWidth - titleWidth) / 2, yPos + 1, (pageWidth + titleWidth) / 2, yPos + 1);
    yPos += 8;

    // Subtitle
    doc.setFontSize(12);
    doc.text(`Periode ${getPeriodLabel(report.tipe_laporan)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Date range (italic)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    const dateRange = `${formatDateIndonesian(report.periode_start)} s/d ${formatDateIndonesian(report.periode_end)}`;
    doc.text(dateRange, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Table
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const col1Width = 10; // No
    const col2Width = 70; // Uraian  
    const col3Width = 45; // Bulan/Periode ini
    const col4Width = 45; // Akumulasi
    const tableWidth = col1Width + col2Width + col3Width + col4Width;
    const tableX = (pageWidth - tableWidth) / 2;

    const rowHeight = 8;
    const headerHeight = 12;

    // Get data from report_data or use totals
    const periodeData = report.report_data?.periode || {
        iuran_wajib: 0,
        simpanan_sukarela: 0,
        simpanan_wajib: 0,
        pembayaran_pinjaman: 0,
        total_pendapatan: report.total_pemasukan,
        total_pengeluaran: report.total_pengeluaran,
        saldo_akhir: report.saldo_akhir
    };

    const akumulasiData = report.report_data?.akumulasi || {
        iuran_wajib: 0,
        simpanan_sukarela: 0,
        simpanan_wajib: 0,
        pembayaran_pinjaman: 0,
        total_pendapatan: report.total_pemasukan,
        total_pengeluaran: report.total_pengeluaran,
        saldo_akhir: report.saldo_akhir
    };

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, yPos, tableWidth, headerHeight, 'FD');
    doc.setFont('helvetica', 'bold');

    let xPos = tableX;
    doc.text('No', xPos + 2, yPos + 5);
    doc.line(xPos + col1Width, yPos, xPos + col1Width, yPos + headerHeight);

    xPos += col1Width;
    doc.text('Uraian', xPos + 2, yPos + 5);
    doc.line(xPos + col2Width, yPos, xPos + col2Width, yPos + headerHeight);

    xPos += col2Width;
    doc.text('Bulan / Periode ini', xPos + 2, yPos + 3);
    doc.text('(Rp)', xPos + 2, yPos + 8);
    doc.line(xPos + col3Width, yPos, xPos + col3Width, yPos + headerHeight);

    xPos += col3Width;
    doc.text('Akumulasi s/d Tahun ini', xPos + 2, yPos + 3);
    doc.text('(Rp)', xPos + 2, yPos + 8);

    // Header border
    doc.setLineWidth(0.3);
    doc.rect(tableX, yPos, tableWidth, headerHeight);
    yPos += headerHeight;

    // Table rows data
    const rows = [
        { no: '1.', uraian: 'Iuran Wajib', periode: periodeData.iuran_wajib || 0, akumulasi: akumulasiData.iuran_wajib || 0 },
        { no: '2.', uraian: 'Simpanan Sukarela', periode: periodeData.simpanan_sukarela || 0, akumulasi: akumulasiData.simpanan_sukarela || 0 },
        { no: '3.', uraian: 'Simpanan Wajib', periode: periodeData.simpanan_wajib || 0, akumulasi: akumulasiData.simpanan_wajib || 0 },
        { no: '4.', uraian: 'Pembayaran Pinjaman', periode: periodeData.pembayaran_pinjaman || 0, akumulasi: akumulasiData.pembayaran_pinjaman || 0 },
    ];

    doc.setFont('helvetica', 'normal');

    rows.forEach((row) => {
        xPos = tableX;
        doc.text(row.no, xPos + 2, yPos + 5);
        doc.line(xPos + col1Width, yPos, xPos + col1Width, yPos + rowHeight);

        xPos += col1Width;
        doc.text(row.uraian, xPos + 2, yPos + 5);
        doc.line(xPos + col2Width, yPos, xPos + col2Width, yPos + rowHeight);

        xPos += col2Width;
        doc.text(formatCurrency(row.periode), xPos + col3Width - 3, yPos + 5, { align: 'right' });
        doc.line(xPos + col3Width, yPos, xPos + col3Width, yPos + rowHeight);

        xPos += col3Width;
        doc.text(formatCurrency(row.akumulasi), xPos + col4Width - 3, yPos + 5, { align: 'right' });

        doc.rect(tableX, yPos, tableWidth, rowHeight);
        yPos += rowHeight;
    });

    // Summary rows (highlighted)
    const summaryRows = [
        { uraian: 'Total Pendapatan', periode: periodeData.total_pendapatan || report.total_pemasukan, akumulasi: akumulasiData.total_pendapatan || report.total_pemasukan, highlight: true },
        { uraian: 'Total Pengeluaran', periode: periodeData.total_pengeluaran || report.total_pengeluaran, akumulasi: akumulasiData.total_pengeluaran || report.total_pengeluaran, highlight: true },
        { uraian: 'Saldo di Bank', periode: periodeData.saldo_akhir || report.saldo_akhir, akumulasi: akumulasiData.saldo_akhir || report.saldo_akhir, highlight: true },
    ];

    doc.setFont('helvetica', 'bold');

    summaryRows.forEach((row) => {
        if (row.highlight) {
            doc.setFillColor(245, 245, 245);
            doc.rect(tableX, yPos, tableWidth, rowHeight, 'F');
        }

        xPos = tableX;
        doc.line(xPos + col1Width, yPos, xPos + col1Width, yPos + rowHeight);

        xPos += col1Width;
        doc.text(row.uraian, xPos + 2, yPos + 5);
        doc.line(xPos + col2Width, yPos, xPos + col2Width, yPos + rowHeight);

        xPos += col2Width;
        doc.text(formatCurrency(row.periode), xPos + col3Width - 3, yPos + 5, { align: 'right' });
        doc.line(xPos + col3Width, yPos, xPos + col3Width, yPos + rowHeight);

        xPos += col3Width;
        doc.text(formatCurrency(row.akumulasi), xPos + col4Width - 3, yPos + 5, { align: 'right' });

        doc.rect(tableX, yPos, tableWidth, rowHeight);
        yPos += rowHeight;
    });

    yPos += 10;

    // KESIMPULAN section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('KESIMPULAN', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const kesimpulanText = `Berdasarkan laporan keuangan periode ${formatDateIndonesian(report.periode_start)} sampai dengan ${formatDateIndonesian(report.periode_end)}, KP2A Cimahi mencatat:`;
    doc.text(kesimpulanText, margin, yPos, { maxWidth: contentWidth });
    yPos += 10;

    // Bullet points
    const bulletPoints = [
        `Total pemasukan sebesar ${formatCurrency(report.total_pemasukan)} (terdiri dari iuran anggota dan pembayaran pinjaman).`,
        `Total pengeluaran sebesar ${formatCurrency(report.total_pengeluaran)}.`,
        `Saldo di bank sebesar ${formatCurrency(report.saldo_akhir)}.`
    ];

    bulletPoints.forEach((point) => {
        doc.text(`•  ${point}`, margin + 3, yPos, { maxWidth: contentWidth - 6 });
        yPos += 6;
    });

    yPos += 3;

    const kondisi = report.saldo_akhir >= 0 ? 'surplus yang baik' : 'defisit yang perlu diperhatikan';
    doc.text(`Kondisi keuangan menunjukkan ${kondisi} untuk periode ini.`, margin, yPos, { maxWidth: contentWidth });
    yPos += 15;

    // Signature section
    const signatureY = yPos;
    const leftSignX = margin;
    const rightSignX = pageWidth - margin - 50;

    doc.setFont('helvetica', 'normal');
    doc.text('Mengetahui,', leftSignX, signatureY);
    doc.text(`Cimahi, ${formatDateIndonesian(new Date().toISOString())}`, rightSignX, signatureY);

    doc.setFont('helvetica', 'bold');
    doc.text('Ketua KP2A Cimahi', leftSignX, signatureY + 5);
    doc.text('Bendahara', rightSignX, signatureY + 5);

    // Signature lines
    doc.setFont('helvetica', 'normal');
    doc.text('( Romdhoni )', leftSignX, signatureY + 30);
    doc.text('( Aan Rusdana )', rightSignX, signatureY + 30);

    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Dicetak pada : ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Page number
    doc.text(`Halaman 1 dari 1`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Save PDF
    const fileName = `Laporan_Keuangan_${getPeriodLabel(report.tipe_laporan)}_${report.periode_start}_${report.periode_end}.pdf`;
    doc.save(fileName);
};

export default generateReportPDF;
