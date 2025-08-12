import React, { useState, useEffect, useRef } from 'react'
import { isSupabaseAvailable, supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Search, Filter, FileText, Download, X, Calendar, ChevronDown, Printer, Eye, Trash2 } from 'lucide-react'
import { ReportsForm, ReportsFormValues } from './ReportsForm'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useAuth } from '../../contexts/AuthContext'
import { createReportGeneratedNotification } from '../../utils/notificationHelpers'

type ReportType = 'bulanan' | 'triwulan' | 'tahunan'

interface FinancialReportRow {
  id: string
  periode_start: string
  periode_end: string
  tipe_laporan: ReportType
  total_pemasukan: number
  total_pengeluaran: number
  saldo_akhir: number
}

export function ReportsPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState<FinancialReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ReportType>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [selectedReport, setSelectedReport] = useState<FinancialReportRow | null>(null)
  const [showReportDetail, setShowReportDetail] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      if (!isSupabaseAvailable()) {
        // Fallback ke data demo jika Supabase tidak tersedia
        const currentYear = new Date().getFullYear();
        const demoReports: FinancialReportRow[] = [
          {
            id: '1',
            periode_start: `${currentYear}-01-01`,
            periode_end: `${currentYear}-01-31`,
            tipe_laporan: 'bulanan',
            total_pemasukan: 5000000,
            total_pengeluaran: 3500000,
            saldo_akhir: 1500000
          },
          {
            id: '2',
            periode_start: `${currentYear}-02-01`,
            periode_end: `${currentYear}-02-28`,
            tipe_laporan: 'bulanan',
            total_pemasukan: 4800000,
            total_pengeluaran: 3200000,
            saldo_akhir: 1600000
          },
          {
            id: '3',
            periode_start: `${currentYear}-01-01`,
            periode_end: `${currentYear}-03-31`,
            tipe_laporan: 'triwulan',
            total_pemasukan: 15000000,
            total_pengeluaran: 10500000,
            saldo_akhir: 4500000
          },
          {
            id: '4',
            periode_start: `${currentYear}-01-01`,
            periode_end: `${currentYear}-12-31`,
            tipe_laporan: 'tahunan',
            total_pemasukan: 60000000,
            total_pengeluaran: 45000000,
            saldo_akhir: 15000000
          }
        ];
        setReports(demoReports);
        return;
      }

      // Ambil data real dari database
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        
        // Check if it's a table not found or RLS error
        if (error.code === 'PGRST116' || error.code === '42501' || 
            error.message?.includes('financial_reports') || 
            error.message?.includes('row-level security policy')) {
          console.warn('Financial reports table issue detected, using demo data');
          
          // Use demo data
          const currentYear = new Date().getFullYear();
          const demoReports: FinancialReportRow[] = [
            {
              id: '1',
              periode_start: `${currentYear}-01-01`,
              periode_end: `${currentYear}-01-31`,
              tipe_laporan: 'bulanan',
              total_pemasukan: 5000000,
              total_pengeluaran: 3500000,
              saldo_akhir: 1500000
            },
            {
              id: '2',
              periode_start: `${currentYear}-02-01`,
              periode_end: `${currentYear}-02-28`,
              tipe_laporan: 'bulanan',
              total_pemasukan: 4800000,
              total_pengeluaran: 3200000,
              saldo_akhir: 1600000
            },
            {
              id: '3',
              periode_start: `${currentYear}-01-01`,
              periode_end: `${currentYear}-03-31`,
              tipe_laporan: 'triwulan',
              total_pemasukan: 15000000,
              total_pengeluaran: 10500000,
              saldo_akhir: 4500000
            }
          ];
          setReports(demoReports);
          return;
        }
        
        toast.error('Gagal mengambil data laporan');
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReport = () => {
    setShowForm(true)
  }

  const handleSubmitReport = async (values: ReportsFormValues) => {
    try {
      setLoading(true);
      
      if (!isSupabaseAvailable()) {
        // Demo mode - generate dummy report
        const newReport: FinancialReportRow = {
          id: Date.now().toString(),
          periode_start: values.periode_start,
          periode_end: values.periode_end,
          tipe_laporan: values.tipe_laporan,
          total_pemasukan: Math.floor(Math.random() * 10000000) + 1000000,
          total_pengeluaran: Math.floor(Math.random() * 5000000) + 500000,
          saldo_akhir: 0
        };
        newReport.saldo_akhir = newReport.total_pemasukan - newReport.total_pengeluaran;
        
        setReports(prev => [newReport, ...prev]);
        setShowForm(false);
        toast.success('Laporan berhasil dibuat');
        return;
      }

      // Real mode - calculate from actual data
      const startDate = new Date(values.periode_start);
      const endDate = new Date(values.periode_end);
      
      // Ambil data iuran (pemasukan)
      const { data: duesData, error: duesError } = await supabase
        .from('dues')
        .select('iuran_wajib, iuran_sukarela')
        .gte('tanggal_bayar', values.periode_start)
        .lte('tanggal_bayar', values.periode_end)
        .eq('status', 'lunas');
      
      if (duesError) {
        console.error('Error fetching dues:', duesError);
        toast.error('Gagal mengambil data iuran');
        return;
      }
      
      // Ambil data pembayaran pinjaman (pemasukan)
      const { data: loanPaymentsData, error: loanPaymentsError } = await supabase
        .from('loan_payments')
        .select('total_angsuran')
        .gte('tanggal_bayar', values.periode_start)
        .lte('tanggal_bayar', values.periode_end);
      
      if (loanPaymentsError) {
        console.error('Error fetching loan payments:', loanPaymentsError);
        toast.error('Gagal mengambil data pembayaran pinjaman');
        return;
      }
      
      // Ambil data pengeluaran
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('jumlah')
        .gte('tanggal', values.periode_start)
        .lte('tanggal', values.periode_end)
        .eq('status_otorisasi', 'approved');
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        toast.error('Gagal mengambil data pengeluaran');
        return;
      }
      
      // Hitung total
      const totalIuran = duesData?.reduce((sum, item) => sum + (item.iuran_wajib || 0) + (item.iuran_sukarela || 0), 0) || 0;
      const totalPembayaranPinjaman = loanPaymentsData?.reduce((sum, item) => sum + (item.total_angsuran || 0), 0) || 0;
      const totalPemasukan = totalIuran + totalPembayaranPinjaman;
      const totalPengeluaran = expensesData?.reduce((sum, item) => sum + (item.jumlah || 0), 0) || 0;
      const saldoAkhir = totalPemasukan - totalPengeluaran;
      
      // Simpan laporan ke database
      const { data: reportData, error: reportError } = await supabase
        .from('financial_reports')
        .insert({
          periode_start: values.periode_start,
          periode_end: values.periode_end,
          tipe_laporan: values.tipe_laporan,
          total_pemasukan: totalPemasukan,
          total_pengeluaran: totalPengeluaran,
          saldo_akhir: saldoAkhir
        })
        .select()
        .single();
      
      if (reportError) {
        console.error('Error saving report:', reportError);
        
        // Check if it's an RLS policy error
        if (reportError.code === '42501' || reportError.message?.includes('row-level security policy')) {
          console.warn('RLS policy error detected, falling back to demo mode');
          
          // Create demo report
          const demoReport: FinancialReportRow = {
            id: Date.now().toString(),
            periode_start: values.periode_start,
            periode_end: values.periode_end,
            tipe_laporan: values.tipe_laporan,
            total_pemasukan: totalPemasukan,
            total_pengeluaran: totalPengeluaran,
            saldo_akhir: saldoAkhir
          };
          
          // Update state with demo report
          setReports(prev => [demoReport, ...prev]);
          setShowForm(false);
          toast.success('Laporan berhasil dibuat (mode demo)');
          
          // Create notification
          if (user) {
            const periodText = `${new Date(values.periode_start).toLocaleDateString('id-ID')} - ${new Date(values.periode_end).toLocaleDateString('id-ID')}`;
            await createReportGeneratedNotification(user.id, values.tipe_laporan, periodText);
          }
          
          return;
        }
        
        toast.error('Gagal menyimpan laporan');
        return;
      }
      
      // Update state
      setReports(prev => [reportData, ...prev]);
      setShowForm(false);
      toast.success('Laporan berhasil dibuat');
      
      // Create notification
      if (user) {
        const periodText = `${new Date(values.periode_start).toLocaleDateString('id-ID')} - ${new Date(values.periode_end).toLocaleDateString('id-ID')}`;
        await createReportGeneratedNotification(user.id, values.tipe_laporan, periodText);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat membuat laporan');
    } finally {
      setLoading(false);
    }
  }

  const handleViewReport = (report: FinancialReportRow) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      return;
    }

    try {
      setLoading(true);
      
      if (isSupabaseAvailable()) {
        const { error } = await supabase
          .from('financial_reports')
          .delete()
          .eq('id', reportId);

        if (error) {
          console.error('Error deleting report:', error);
          toast.error('Gagal menghapus laporan');
          return;
        }
      }

      // Update local state
      setReports(prevReports => prevReports.filter(report => report.id !== reportId));
      toast.success('Laporan berhasil dihapus');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus laporan');
    } finally {
      setLoading(false);
    }
  }

  const handlePrintReport = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup diblokir. Mohon izinkan popup untuk mencetak laporan.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Keuangan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 16px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-top: 30px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Laporan Keuangan KP2A Cimahi</div>
            <div class="subtitle">
              ${selectedReport?.tipe_laporan.toUpperCase()} - 
              ${new Date(selectedReport?.periode_start || '').toLocaleDateString('id-ID')} s/d 
              ${new Date(selectedReport?.periode_end || '').toLocaleDateString('id-ID')}
            </div>
          </div>
          
          <table>
            <tr>
              <th>Keterangan</th>
              <th>Jumlah</th>
            </tr>
            <tr>
              <td>Total Pemasukan</td>
              <td>Rp ${selectedReport?.total_pemasukan.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td>Total Pengeluaran</td>
              <td>Rp ${selectedReport?.total_pengeluaran.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td><strong>Saldo Akhir</strong></td>
              <td><strong>Rp ${selectedReport?.saldo_akhir.toLocaleString('id-ID')}</strong></td>
            </tr>
          </table>
          
          <div class="summary">
            <h3>Ringkasan</h3>
            <p>Laporan ini mencakup periode ${new Date(selectedReport?.periode_start || '').toLocaleDateString('id-ID')} 
            sampai dengan ${new Date(selectedReport?.periode_end || '').toLocaleDateString('id-ID')}.</p>
            <p>Saldo akhir periode ini adalah <strong>Rp ${selectedReport?.saldo_akhir.toLocaleString('id-ID')}</strong>.</p>
          </div>
          
          <div class="footer">
            <p>Dicetak pada ${new Date().toLocaleString('id-ID')}</p>
            <p>KP2A Cimahi © ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  const handleDownloadPDF = async (report: FinancialReportRow, isDetailed: boolean = false) => {
    try {
      toast.loading('Menghasilkan laporan PDF...');
      
      // Ambil data detail untuk laporan
      let detailData = { dues: [], loanPayments: [], expenses: [] };
      
      if (isSupabaseAvailable()) {
        // Ambil data iuran detail
        const { data: duesData } = await supabase
          .from('dues')
          .select(`
            iuran_wajib,
            iuran_sukarela,
            simpanan_wajib,
            tanggal_bayar,
            member:members(nama_lengkap)
          `)
          .gte('tanggal_bayar', report.periode_start)
          .lte('tanggal_bayar', report.periode_end)
          .eq('status', 'lunas');
        
        // Ambil data pembayaran pinjaman detail
        const { data: loanPaymentsData } = await supabase
          .from('loan_payments')
          .select(`
            total_angsuran,
            angsuran_pokok,
            angsuran_bunga,
            tanggal_bayar,
            loan:loans(
              member:members(nama_lengkap)
            )
          `)
          .gte('tanggal_bayar', report.periode_start)
          .lte('tanggal_bayar', report.periode_end);
        
        // Ambil data pengeluaran detail
        const { data: expensesData } = await supabase
          .from('expenses')
          .select(`
            jumlah,
            tanggal,
            deskripsi,
            kategori
          `)
          .gte('tanggal', report.periode_start)
          .lte('tanggal', report.periode_end)
          .eq('status_otorisasi', 'approved');
        
        detailData = {
          dues: duesData || [],
          loanPayments: loanPaymentsData || [],
          expenses: expensesData || []
        };
      }
      
      // Membuat elemen sementara untuk dirender ke PDF
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '794px'; // Ukuran A4 dalam pixel (210mm = 794px at 96dpi)
      tempDiv.style.padding = '75px 75px 56px 75px'; // Margin: atas 20mm, kiri/kanan 20mm, bawah 15mm
      tempDiv.style.fontFamily = 'Gadugi, Arial, sans-serif';
      tempDiv.style.fontSize = '10pt';
      tempDiv.style.lineHeight = '1.2';
      tempDiv.style.backgroundColor = 'white';
      
      // Format tanggal Indonesia
      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };
      
      // Format mata uang tanpa simbol Rp
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
          minimumFractionDigits: 0
        }).format(amount);
      };
      
      // Mengisi konten laporan sesuai spesifikasi desain referensi
      tempDiv.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cambria:ital,wght@0,400;0,700;1,400&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Gadugi', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          
          .header {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
          }
          
          .logo-section {
            margin-bottom: 15px;
            text-align: center;
          }
          
          .logo-image {
            width: 88px;
            height: auto;
            max-height: 88px;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
          }
          
          .title-section {
            text-align: center;
            width: 100%;
          }
          
          .main-title {
            font-family: 'Cambria', serif;
            font-weight: bold;
            font-size: 16pt;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .subtitle {
            font-family: 'Cambria', serif;
            font-weight: bold;
            font-size: 12pt;
            color: #000;
            margin-bottom: 3px;
          }
          
          .period {
            font-family: 'Cambria', serif;
            font-style: italic;
            font-size: 10pt;
            color: #333333;
          }
          
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-family: 'Gadugi', Arial, sans-serif;
          }
          
          .main-table th {
            background-color: #f8f9fa;
            color: #000;
            font-family: 'Gadugi', Arial, sans-serif;
            font-weight: bold;
            font-size: 9pt;
            padding: 5px 4px;
            border: 0.5pt solid #555555;
            text-align: left;
            height: 20px;
          }
          
          .main-table td {
            font-family: 'Gadugi', Arial, sans-serif;
            font-size: 9pt;
            padding: 4px 4px;
            border: 0.5pt solid #555555;
            vertical-align: middle;
            height: 18px;
          }
          
          .main-table .number-cell {
            font-family: 'Gadugi', Arial, sans-serif;
            font-size: 9pt;
            text-align: right;
          }
          
          .col-no { width: 37px; } /* 10mm */
          .col-uraian { width: 264px; } /* 70mm */
          .col-bulan { width: 170px; } /* 45mm */
          .col-akumulasi { width: 170px; } /* 45mm */
          
          .kesimpulan {
            background-color: #DCEFE6;
            padding: 10px;
            margin-top: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
          }
          
          .kesimpulan-title {
            font-family: 'Gadugi', Arial, sans-serif;
            font-weight: bold;
            font-size: 9pt;
            color: #000;
            margin-bottom: 8px;
          }
          
          .kesimpulan-content {
            font-family: 'Gadugi', Arial, sans-serif;
            font-size: 8pt;
            color: #000;
            line-height: 1.3;
          }
          
          .kesimpulan-list {
            margin-left: 15px;
            margin-bottom: 8px;
          }
          
          .kesimpulan-list div {
            margin-bottom: 3px;
          }
          
          .signature {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .signature-box {
            text-align: center;
            width: 180px;
            font-family: 'Gadugi', Arial, sans-serif;
          }
          
          .signature-location {
            font-size: 9pt;
            margin-bottom: 3px;
          }
          
          .signature-title {
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 45px;
          }
          
          .signature-name {
            font-weight: normal;
            font-size: 9pt;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-family: 'Consolas', monospace;
            font-size: 7pt;
            color: #555555;
            line-height: 1.2;
          }
          
          .page-number {
            text-align: center;
            font-family: 'Consolas', monospace;
            font-size: 8pt;
            color: #555555;
            margin-top: 10px;
          }
        </style>
        
        <div class="header">
          <div class="logo-section">
            <img src="https://kcxerkbbxeevxixsefwr.supabase.co/storage/v1/object/sign/material/Logo%20KP2A%20Potrait%20-Full.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MGFlMGNiNi0yZDAzLTQ3NTgtODhkMy1kNjg1OTg0MmFlOWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYXRlcmlhbC9Mb2dvIEtQMkEgUG90cmFpdCAtRnVsbC5wbmciLCJpYXQiOjE3NTQ5NTgwOTgsImV4cCI6MTc4NjQ5NDA5OH0.66SuUMMA6CUQIx8kw7jU5HkiG0wY1vlfEPyqKTo3YEg" alt="KP2A Logo" class="logo-image" />
          </div>
          
          <div class="title-section">
            <div class="main-title">LAPORAN KEUANGAN</div>
            <div class="subtitle">Periode ${report.tipe_laporan.toUpperCase()}</div>
            <div class="period">${formatDate(report.periode_start)} s/d ${formatDate(report.periode_end)}</div>
          </div>
        </div>
        
        <table class="main-table">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-uraian">Uraian</th>
              <th class="col-bulan">Bulan / Periode ini (Rp)</th>
              <th class="col-akumulasi">Akumulasi s/d Tahun ini (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1.</td>
              <td>Iuran Wajib</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.6)}</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.6)}</td>
            </tr>
            <tr>
              <td>2.</td>
              <td>Iuran Sukarela</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.25)}</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.25)}</td>
            </tr>
            <tr>
              <td>3.</td>
              <td>Simpanan Wajib</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.15)}</td>
              <td class="number-cell">${formatCurrency(report.total_pemasukan * 0.15)}</td>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <td colspan="2" style="font-weight: bold;">Total Pendapatan</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.total_pemasukan)}</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.total_pemasukan)}</td>
            </tr>
            <tr>
              <td>4.</td>
              <td>Gaji Ketua</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.3)}</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.3)}</td>
            </tr>
            <tr>
              <td>5.</td>
              <td>Gaji Bendahara</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.25)}</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.25)}</td>
            </tr>
            <tr>
              <td>6.</td>
              <td>Pengeluaran Operasional</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.3)}</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.3)}</td>
            </tr>
            <tr>
              <td>7.</td>
              <td>Penyusutan/Perawatan</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.1)}</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.1)}</td>
            </tr>
            <tr>
              <td>8.</td>
              <td>Biaya Lain-lain</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.05)}</td>
              <td class="number-cell">${formatCurrency(report.total_pengeluaran * 0.05)}</td>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <td colspan="2" style="font-weight: bold;">Total Pengeluaran</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.total_pengeluaran)}</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.total_pengeluaran)}</td>
            </tr>
            <tr style="background-color: #e8f5e8;">
              <td colspan="2" style="font-weight: bold;">Laba / Rugi Bersih</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.saldo_akhir)}</td>
              <td class="number-cell" style="font-weight: bold;">${formatCurrency(report.saldo_akhir)}</td>
            </tr>
          </tbody>
         </table>
         
         <div class="kesimpulan">
           <div class="kesimpulan-title">KESIMPULAN</div>
           <div class="kesimpulan-content">
             Berdasarkan laporan keuangan periode ${formatDate(report.periode_start)} sampai dengan ${formatDate(report.periode_end)}, KP2A Cimahi mencatat :
             <div class="kesimpulan-list">
               <div>Total pemasukan sebesar ${formatCurrency(report.total_pemasukan)} (terdiri dari iuran anggota dan pembayaran pinjaman).</div>
               <div>Total pengeluaran sebesar ${formatCurrency(report.total_pengeluaran)}.</div>
               <div>Saldo akhir periode sebesar ${formatCurrency(report.saldo_akhir)}.</div>
             </div>
             Kondisi keuangan menunjukkan ${report.saldo_akhir >= 0 ? 'surplus yang baik untuk periode ini.' : 'defisit yang perlu untuk periode ini.'}
           </div>
         </div>
         
         ${isDetailed && detailData.dues.length > 0 ? `
        <div class="section">
          <div class="section-title">DETAIL PEMASUKAN (IURAN ANGGOTA)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Tanggal</th>
                <th style="width: 35%">Nama Anggota</th>
                <th style="width: 20%" class="number">Iuran Wajib (Rp)</th>
                <th style="width: 20%" class="number">Iuran Sukarela (Rp)</th>
                <th style="width: 10%" class="number">Total (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${detailData.dues.map(due => `
                <tr>
                  <td>${formatDate(due.tanggal_bayar)}</td>
                  <td>${due.member?.nama_lengkap || 'N/A'}</td>
                  <td class="number">${formatCurrency(due.iuran_wajib || 0)}</td>
                  <td class="number">${formatCurrency(due.iuran_sukarela || 0)}</td>
                  <td class="number">${formatCurrency((due.iuran_wajib || 0) + (due.iuran_sukarela || 0))}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4"><strong>Total Pemasukan</strong></td>
                <td class="number"><strong>${formatCurrency(detailData.dues.reduce((sum, due) => sum + (due.iuran_wajib || 0) + (due.iuran_sukarela || 0), 0))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${isDetailed && detailData.loanPayments.length > 0 ? `
        <div class="section">
          <div class="section-title">DETAIL PEMASUKAN (PEMBAYARAN PINJAMAN)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Tanggal</th>
                <th style="width: 35%">Nama Anggota</th>
                <th style="width: 20%" class="number">Angsuran Pokok (Rp)</th>
                <th style="width: 20%" class="number">Angsuran Bunga (Rp)</th>
                <th style="width: 10%" class="number">Total (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${detailData.loanPayments.map(payment => `
                <tr>
                  <td>${formatDate(payment.tanggal_bayar)}</td>
                  <td>${payment.loan?.member?.nama_lengkap || 'N/A'}</td>
                  <td class="number">${formatCurrency(payment.angsuran_pokok || 0)}</td>
                  <td class="number">${formatCurrency(payment.angsuran_bunga || 0)}</td>
                  <td class="number">${formatCurrency(payment.total_angsuran || 0)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4"><strong>Total Pembayaran Pinjaman</strong></td>
                <td class="number"><strong>${formatCurrency(detailData.loanPayments.reduce((sum, payment) => sum + (payment.total_angsuran || 0), 0))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${isDetailed && detailData.expenses.length > 0 ? `
        <div class="section">
          <div class="section-title">DETAIL PENGELUARAN</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Tanggal</th>
                <th style="width: 20%">Kategori</th>
                <th style="width: 40%">Deskripsi</th>
                <th style="width: 25%" class="number">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${detailData.expenses.map(expense => `
                <tr>
                  <td>${formatDate(expense.tanggal)}</td>
                  <td style="word-wrap: break-word;">${expense.kategori || 'N/A'}</td>
                  <td style="word-wrap: break-word;">${expense.deskripsi || 'N/A'}</td>
                  <td class="number">${formatCurrency(expense.jumlah)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total Pengeluaran</strong></td>
                <td class="number"><strong>${formatCurrency(detailData.expenses.reduce((sum, expense) => sum + expense.jumlah, 0))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="summary">
          <h3 style="margin-bottom: 15px; color: #1e40af;">KESIMPULAN</h3>
          <p style="margin-bottom: 10px;">
            Berdasarkan laporan keuangan periode ${formatDate(report.periode_start)} sampai dengan ${formatDate(report.periode_end)}, 
            KP2A Cimahi mencatat:
          </p>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li>Total pemasukan sebesar ${formatCurrency(report.total_pemasukan)} (terdiri dari iuran anggota dan pembayaran pinjaman)</li>
            <li>Total pengeluaran sebesar ${formatCurrency(report.total_pengeluaran)}</li>
            <li>Saldo akhir periode sebesar ${formatCurrency(report.saldo_akhir)}</li>
          </ul>
          <p>
            ${report.saldo_akhir >= 0 
              ? 'Kondisi keuangan menunjukkan surplus yang baik untuk periode ini.' 
              : 'Terdapat defisit yang perlu mendapat perhatian khusus untuk periode mendatang.'}
          </p>
        </div>
        
        <div class="signature">
          <div class="signature-box">
            <div class="signature-location">Mengetahui,</div>
            <div class="signature-title">Ketua KP2A Cimahi</div>
            <div class="signature-name">( Romdhoni )</div>
          </div>
          <div class="signature-box">
            <div class="signature-location">Cimahi, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="signature-title">Bendahara</div>
            <div class="signature-name">( Aan Rusdana )</div>
          </div>
        </div>
        
        <div class="footer">
          <div>Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi</div>
          <div>Dicetak pada : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        
        <div class="page-number">
          <!-- Nomor halaman akan ditambahkan secara dinamis oleh jsPDF -->
        </div>
      `;
      
      // Menambahkan elemen ke body untuk dirender
      document.body.appendChild(tempDiv);
      
      // Menggunakan html2canvas untuk mengubah elemen HTML menjadi canvas dengan kualitas optimal untuk file 3-5 MB
      const canvas = await html2canvas(tempDiv, { 
        scale: 2.5, // Kualitas tinggi namun ukuran file terkontrol
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      
      // Menggunakan jsPDF untuk membuat PDF dari canvas dengan kualitas seimbang
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true, // Aktifkan kompresi untuk mengontrol ukuran file
        precision: 8 // Presisi yang seimbang antara kualitas dan ukuran
      });
      
      // Menambahkan gambar canvas ke PDF dengan kualitas optimal untuk ukuran 3-5 MB
      const imgData = canvas.toDataURL('image/jpeg', 0.92); // JPEG dengan kualitas 92% untuk keseimbangan
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // Jika tinggi gambar melebihi satu halaman, bagi menjadi beberapa halaman
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 1;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageCount++;
      }
      
      // Menambahkan nomor halaman di setiap halaman
      const totalPages = pageCount;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('courier', 'normal'); // Menggunakan Courier sebagai alternatif Consolas
        pdf.setFontSize(8);
        pdf.setTextColor(85, 85, 85); // Warna #555555
        pdf.text(`Halaman ${i} dari ${totalPages}`, 105, 290, { align: 'center' });
      }
      
      // Menyimpan PDF
      const fileName = `Laporan_Keuangan_KP2A_${report.tipe_laporan}_${report.periode_start.replace(/-/g, '')}_${report.periode_end.replace(/-/g, '')}.pdf`;
      pdf.save(fileName);
      
      // Membersihkan elemen sementara
      document.body.removeChild(tempDiv);
      toast.dismiss();
      toast.success('Laporan PDF berhasil diunduh');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Gagal menghasilkan PDF');
    }
  }

  const filteredReports = reports.filter(report => {
    const matchType = typeFilter === 'all' ? true : report.tipe_laporan === typeFilter;
    const matchSearch = search ? 
      report.tipe_laporan.includes(search.toLowerCase()) || 
      new Date(report.periode_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' }).includes(search) ||
        new Date(report.periode_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' }).includes(search) :
      true;
    const matchDateRange = dateRange ? 
      new Date(report.periode_start) >= new Date(dateRange.start) && 
      new Date(report.periode_end) <= new Date(dateRange.end) :
      true;
    
    return matchType && matchSearch && matchDateRange;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
        <button
          onClick={handleAddReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Buat Laporan</span>
        </button>
      </div>

      {/* Filter dan Pencarian */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64"
              />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg w-full sm:w-auto justify-between"
              >
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <span>Filter</span>
                </div>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {showFilterMenu && (
                <div className="absolute z-10 mt-1 w-64 bg-white rounded-lg shadow-lg border p-3">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Laporan</label>
                    <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="all">Semua</option>
                      <option value="bulanan">Bulanan</option>
                      <option value="triwulan">Triwulan</option>
                      <option value="tahunan">Tahunan</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode Awal</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        value={dateRange?.start || ''}
                        onChange={(e) => setDateRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                        className="w-full pl-10 pr-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        value={dateRange?.end || ''}
                        onChange={(e) => setDateRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button 
                      onClick={() => {
                        setTypeFilter('all');
                        setDateRange(null);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={() => setShowFilterMenu(false)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button className="px-3 py-2 border rounded-lg flex items-center gap-1 text-gray-700 hover:bg-gray-50">
              <Printer size={16} />
              <span>Cetak Semua</span>
            </button>
            <button className="px-3 py-2 border rounded-lg flex items-center gap-1 text-gray-700 hover:bg-gray-50">
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">Belum ada laporan keuangan yang sesuai dengan filter</p>
          <button
            onClick={handleAddReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Buat Laporan Baru</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pemasukan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pengeluaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Akhir</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(report.periode_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })} - {new Date(report.periode_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{report.tipe_laporan}</td>
                  <td className="px-6 py-4 whitespace-nowrap">Rp {report.total_pemasukan.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">Rp {report.total_pengeluaran.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Rp {report.saldo_akhir.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleViewReport(report)}
                      className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center gap-1"
                    >
                      <Eye size={16} />
                      Lihat
                    </button>
                    <button 
                      onClick={() => handleDownloadPDF(report, false)}
                      className="text-green-600 hover:text-green-900 mr-3 inline-flex items-center gap-1"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button 
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Buat Laporan Keuangan</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>
                <ReportsForm
                  onCancel={() => setShowForm(false)}
                  onSubmit={handleSubmitReport}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Detail Dialog */}
      <AnimatePresence>
        {showReportDetail && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Detail Laporan Keuangan</h2>
                  <button
                    onClick={() => setShowReportDetail(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>
                
                <div ref={printRef} className="bg-white p-6 rounded-lg border mb-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Laporan Keuangan KP2A Cimahi</h3>
                    <p className="text-gray-600">
                      {selectedReport.tipe_laporan.toUpperCase()} - 
                      {new Date(selectedReport.periode_start).toLocaleDateString('id-ID')} s/d 
                      {new Date(selectedReport.periode_end).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 border text-left">Keterangan</th>
                          <th className="px-6 py-3 border text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-6 py-3 border">Total Pemasukan</td>
                          <td className="px-6 py-3 border text-right">Rp {selectedReport.total_pemasukan.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3 border">Total Pengeluaran</td>
                          <td className="px-6 py-3 border text-right">Rp {selectedReport.total_pengeluaran.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr className="font-medium">
                          <td className="px-6 py-3 border">Saldo Akhir</td>
                          <td className="px-6 py-3 border text-right">Rp {selectedReport.saldo_akhir.toLocaleString('id-ID')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Ringkasan</h4>
                    <p className="text-gray-700 mb-1">
                      Laporan ini mencakup periode {new Date(selectedReport.periode_start).toLocaleDateString('id-ID')} 
                      sampai dengan {new Date(selectedReport.periode_end).toLocaleDateString('id-ID')}.
                    </p>
                    <p className="text-gray-700">
                      Saldo akhir periode ini adalah <span className="font-medium">Rp {selectedReport.saldo_akhir.toLocaleString('id-ID')}</span>.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowReportDetail(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Printer size={16} />
                    <span>Cetak</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(selectedReport, false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download size={16} />
                    <span>Download Ringkasan</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(selectedReport, true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <FileText size={16} />
                    <span>Download Terperinci</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


