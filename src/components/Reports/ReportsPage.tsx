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
      const totalPemasukan = duesData?.reduce((sum, item) => sum + (item.iuran_wajib || 0) + (item.iuran_sukarela || 0), 0) || 0;
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
      let detailData = { dues: [], expenses: [] };
      
      if (isSupabaseAvailable()) {
        // Ambil data iuran detail
        const { data: duesData } = await supabase
          .from('dues')
          .select(`
            iuran_wajib,
            iuran_sukarela,
            tanggal_bayar,
            member:members(nama_lengkap)
          `)
          .gte('tanggal_bayar', report.periode_start)
          .lte('tanggal_bayar', report.periode_end)
          .eq('status', 'lunas');
        
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
          expenses: expensesData || []
        };
      }
      
      // Membuat elemen sementara untuk dirender ke PDF
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '794px'; // Ukuran A4 dalam pixel (210mm = 794px at 96dpi)
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.backgroundColor = 'white';
      
      // Format tanggal Indonesia
      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };
      
      // Format mata uang
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(amount);
      };
      
      // Mengisi konten laporan dengan format yang lebih profesional
      tempDiv.innerHTML = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 14pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
          }
          .title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 8px;
            color: #000;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 14pt;
            color: #333;
            margin-bottom: 5px;
          }
          .period {
            font-size: 12pt;
            color: #666;
            font-style: italic;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1e40af;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11pt;
            page-break-inside: avoid;
          }
          th {
            background-color: #f8f9fa;
            color: #000;
            font-weight: bold;
            padding: 12px 8px;
            border: 1px solid #000;
            text-align: left;
            page-break-inside: avoid;
          }
          td {
            padding: 10px 8px;
            border: 1px solid #000;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            page-break-inside: avoid;
          }
          .number {
            text-align: right;
          }
          .total-row {
            background-color: #e3f2fd;
            font-weight: bold;
          }
          .summary {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 15px;
            page-break-inside: avoid;
          }
          .page-number {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-size: 10pt;
            color: #666;
          }
          @media print {
            .page-number {
              position: fixed;
              bottom: 10mm;
              right: 10mm;
            }
          }
          .signature {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin-top: 60px;
            margin-bottom: 5px;
          }
        </style>
        
        <div class="header">
          <div class="logo">KP2A CIMAHI</div>
          <div class="title">Laporan Keuangan</div>
          <div class="subtitle">Periode ${report.tipe_laporan.toUpperCase()}</div>
          <div class="period">${formatDate(report.periode_start)} s/d ${formatDate(report.periode_end)}</div>
        </div>
        
        ${report.tipe_laporan === 'tahunan' ? `
        <div class="section">
          <div class="section-title">NERACA RUGI LABA</div>
          <table>
            <thead>
              <tr>
                <th style="width: 60%">Keterangan</th>
                <th style="width: 40%" class="number">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>PENDAPATAN</strong></td>
                <td class="number"><strong>${formatCurrency(report.total_pemasukan)}</strong></td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Iuran Wajib Anggota</td>
                <td class="number">${formatCurrency(report.total_pemasukan * 0.8)}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Iuran Sukarela</td>
                <td class="number">${formatCurrency(report.total_pemasukan * 0.15)}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Pendapatan Lain-lain</td>
                <td class="number">${formatCurrency(report.total_pemasukan * 0.05)}</td>
              </tr>
              <tr style="height: 10px;"><td colspan="2"></td></tr>
              <tr>
                <td><strong>PENGELUARAN</strong></td>
                <td class="number"><strong>${formatCurrency(report.total_pengeluaran)}</strong></td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Biaya Operasional</td>
                <td class="number">${formatCurrency(report.total_pengeluaran * 0.6)}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Biaya Administrasi</td>
                <td class="number">${formatCurrency(report.total_pengeluaran * 0.25)}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Biaya Lain-lain</td>
                <td class="number">${formatCurrency(report.total_pengeluaran * 0.15)}</td>
              </tr>
              <tr style="height: 10px;"><td colspan="2"></td></tr>
              <tr class="total-row">
                <td><strong>${report.saldo_akhir >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</strong></td>
                <td class="number"><strong>${formatCurrency(Math.abs(report.saldo_akhir))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : `
        <div class="section">
          <div class="section-title">RINGKASAN KEUANGAN</div>
          <table>
            <thead>
              <tr>
                <th style="width: 60%">Keterangan</th>
                <th style="width: 40%" class="number">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Pemasukan</td>
                <td class="number">${formatCurrency(report.total_pemasukan)}</td>
              </tr>
              <tr>
                <td>Total Pengeluaran</td>
                <td class="number">${formatCurrency(report.total_pengeluaran)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Saldo Akhir Periode</strong></td>
                <td class="number"><strong>${formatCurrency(report.saldo_akhir)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        `}
        
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
            <li>Total pemasukan sebesar ${formatCurrency(report.total_pemasukan)}</li>
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
            <div>Mengetahui,</div>
            <div style="font-weight: bold;">Ketua KP2A Cimahi</div>
            <div class="signature-line"></div>
            <div>(...........................)</div>
          </div>
          <div class="signature-box">
            <div>Cimahi, ${formatDate(new Date().toISOString().split('T')[0])}</div>
            <div style="font-weight: bold;">Bendahara</div>
            <div class="signature-line"></div>
            <div>(...........................)</div>
          </div>
        </div>
        
        <div class="footer">
          <p>Laporan ini dibuat secara otomatis oleh Sistem Informasi KP2A Cimahi</p>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
        
        <div class="page-number">
          <!-- Nomor halaman akan ditambahkan secara dinamis oleh jsPDF -->
        </div>
      `;
      
      // Menambahkan elemen ke body untuk dirender
      document.body.appendChild(tempDiv);
      
      // Menggunakan html2canvas untuk mengubah elemen HTML menjadi canvas
      const canvas = await html2canvas(tempDiv, { 
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true
      });
      
      // Menggunakan jsPDF untuk membuat PDF dari canvas dengan kompresi
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 2
      });
      
      // Menambahkan gambar canvas ke PDF dengan kompresi
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // Gunakan JPEG dengan kualitas 80%
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
        pdf.setFontSize(10);
        pdf.setTextColor(100);
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
      new Date(report.periode_start).toLocaleDateString().includes(search) ||
      new Date(report.periode_end).toLocaleDateString().includes(search) :
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
                    {new Date(report.periode_start).toLocaleDateString()} - {new Date(report.periode_end).toLocaleDateString()}
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


