import React, { useState, useEffect, useRef } from 'react'
import { isSupabaseAvailable, supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Search, Filter, FileText, Download, X, Calendar, ChevronDown, Printer } from 'lucide-react'
import { ReportsForm, ReportsFormValues } from './ReportsForm'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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
        // Fallback ke simulasi jika Supabase tidak tersedia
        const newReport: FinancialReportRow = {
          id: `${Date.now()}`,
          ...values,
          total_pemasukan: Math.floor(Math.random() * 10000000) + 1000000,
          total_pengeluaran: Math.floor(Math.random() * 5000000) + 500000,
          saldo_akhir: 0
        };
        
        newReport.saldo_akhir = newReport.total_pemasukan - newReport.total_pengeluaran;
        
        setReports([newReport, ...reports]);
        toast.success('Laporan berhasil dibuat (mode demo)');
        setShowForm(false);
        return;
      }

      // Hitung total pemasukan dan pengeluaran dari data real
      const { data: incomeData } = await supabase
        .from('dues')
        .select('iuran_wajib, iuran_sukarela')
        .gte('tanggal_bayar', values.periode_start)
        .lte('tanggal_bayar', values.periode_end)
        .eq('status', 'lunas');

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('jumlah')
        .gte('tanggal', values.periode_start)
        .lte('tanggal', values.periode_end)
        .eq('status_otorisasi', 'approved');

      const totalPemasukan = incomeData?.reduce((sum, item) => 
        sum + (item.iuran_wajib || 0) + (item.iuran_sukarela || 0), 0) || 0;
      
      const totalPengeluaran = expenseData?.reduce((sum, item) => 
        sum + (item.jumlah || 0), 0) || 0;

      const saldoAkhir = totalPemasukan - totalPengeluaran;

      // Simpan laporan ke database
      const { data, error } = await supabase
        .from('financial_reports')
        .insert({
          periode_start: values.periode_start,
          periode_end: values.periode_end,
          tipe_laporan: values.tipe_laporan,
          total_pemasukan: totalPemasukan,
          total_pengeluaran: totalPengeluaran,
          saldo_akhir: saldoAkhir,
          laporan_data: {
            income_details: incomeData,
            expense_details: expenseData
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating report:', error);
        toast.error('Gagal membuat laporan');
        return;
      }

      // Refresh data laporan
      await fetchReports();
      toast.success('Laporan berhasil dibuat');
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal membuat laporan');
    } finally {
      setLoading(false);
    }
  }

  const handleViewReport = (report: FinancialReportRow) => {
    setSelectedReport(report);
    setShowReportDetail(true);
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

  const handleDownloadPDF = (report: FinancialReportRow) => {
    toast.success('Laporan PDF sedang diunduh');
    
    // Membuat elemen sementara untuk dirender ke PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.width = '210mm'; // Ukuran A4
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    // Mengisi konten laporan dengan format yang lebih profesional
     tempDiv.innerHTML = `
       <style>
         body {
           font-family: Arial, sans-serif;
           font-size: 11pt;
           line-height: 1.4;
           color: #333;
         }
         .header {
           text-align: center;
           margin-bottom: 20px;
           border-bottom: 1px solid #eaeaea;
           padding-bottom: 15px;
         }
         .title {
           font-size: 16pt;
           font-weight: bold;
           margin-bottom: 5px;
           color: #2c3e50;
         }
         .subtitle {
           font-size: 11pt;
           color: #7f8c8d;
           margin-bottom: 5px;
         }
         .logo {
           margin-bottom: 10px;
           font-weight: bold;
           color: #3498db;
           font-size: 10pt;
         }
         table {
           width: 100%;
           border-collapse: collapse;
           margin-bottom: 20px;
           font-size: 10pt;
         }
         th {
           background-color: #f8f9fa;
           color: #2c3e50;
           font-weight: 600;
           text-align: left;
           padding: 8px 10px;
           border: 1px solid #e0e0e0;
         }
         td {
           padding: 8px 10px;
           border: 1px solid #e0e0e0;
           vertical-align: top;
         }
         .amount {
           text-align: right;
           font-family: 'Courier New', monospace;
         }
         .total-row {
           background-color: #f8f9fa;
           font-weight: bold;
         }
         .summary {
           margin-top: 20px;
           font-size: 10pt;
         }
         .summary-title {
           font-size: 12pt;
           font-weight: 600;
           color: #2c3e50;
           margin-bottom: 8px;
         }
         .footer {
           margin-top: 30px;
           text-align: center;
           font-size: 9pt;
           color: #7f8c8d;
           border-top: 1px solid #eaeaea;
           padding-top: 10px;
         }
         .highlight {
           color: #2980b9;
         }
       </style>
       
       <div class="header">
         <div class="logo">KP2A CIMAHI</div>
         <div class="title">Laporan Keuangan</div>
         <div class="subtitle">
           ${report.tipe_laporan.charAt(0).toUpperCase() + report.tipe_laporan.slice(1)} | 
           ${new Date(report.periode_start).toLocaleDateString('id-ID')} s/d 
           ${new Date(report.periode_end).toLocaleDateString('id-ID')}
         </div>
       </div>
       
       <table>
         <thead>
           <tr>
             <th style="width: 60%;">Keterangan</th>
             <th style="width: 40%;">Jumlah</th>
           </tr>
         </thead>
         <tbody>
           <tr>
             <td>Total Pemasukan</td>
             <td class="amount">Rp ${report.total_pemasukan.toLocaleString('id-ID')}</td>
           </tr>
           <tr>
             <td>Total Pengeluaran</td>
             <td class="amount">Rp ${report.total_pengeluaran.toLocaleString('id-ID')}</td>
           </tr>
           <tr class="total-row">
             <td>Saldo Akhir</td>
             <td class="amount">Rp ${report.saldo_akhir.toLocaleString('id-ID')}</td>
           </tr>
         </tbody>
       </table>
       
       <div class="summary">
         <div class="summary-title">Ringkasan</div>
         <p>
           Laporan keuangan ini mencakup periode <span class="highlight">${new Date(report.periode_start).toLocaleDateString('id-ID')}</span> 
           sampai dengan <span class="highlight">${new Date(report.periode_end).toLocaleDateString('id-ID')}</span>.
         </p>
         <p>
           Saldo akhir periode ini adalah <span class="highlight">Rp ${report.saldo_akhir.toLocaleString('id-ID')}</span>.
         </p>
       </div>
       
       <div class="footer">
         <p>Dicetak pada ${new Date().toLocaleString('id-ID')}</p>
         <p>KP2A Cimahi © ${new Date().getFullYear()}</p>
       </div>
     `;
    
    // Menambahkan elemen ke body untuk dirender
    document.body.appendChild(tempDiv);
    
    // Menggunakan html2canvas untuk mengubah elemen HTML menjadi canvas
    html2canvas(tempDiv, { scale: 2 }).then(canvas => {
      // Menggunakan jsPDF untuk membuat PDF dari canvas
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Menambahkan gambar canvas ke PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Menyimpan PDF
      pdf.save(`laporan-${report.tipe_laporan}-${report.periode_start}.pdf`);
      
      // Membersihkan elemen sementara
      document.body.removeChild(tempDiv);
      toast.success('Laporan PDF berhasil diunduh');
    });
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
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Lihat
                    </button>
                    <button 
                      onClick={() => handleDownloadPDF(report)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Download
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
                    onClick={() => handleDownloadPDF(selectedReport)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download size={16} />
                    <span>Download PDF</span>
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


