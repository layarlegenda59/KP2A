import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { reportsApi } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FaPlus, FaSearch, FaFilter, FaFile, FaDownload, FaTimes, FaCalendar, FaChevronDown, FaPrint, FaEye, FaTrash, FaCog, FaChartBar, FaChartPie, FaArrowUp, FaArrowDown, FaList } from 'react-icons/fa'
import { ReportsForm, ReportsFormValues } from './ReportsForm'
import { YearEndProcessing } from './YearEndProcessing'
import { useAuth } from '../../contexts/AuthContext'
import { createReportGeneratedNotification } from '../../utils/notificationHelpers'
import { generateReportPDF } from './generateReportPDF'

type ReportType = 'bulanan' | 'triwulan' | 'tahunan'

interface FinancialReportRow {
  id: string
  periode_start: string
  periode_end: string
  tipe_laporan: ReportType
  total_pemasukan: number
  total_pengeluaran: number
  saldo_akhir: number
  report_data?: any
  data_source?: string
  transaction_count?: number
  category_breakdown?: any
  payment_method_breakdown?: any
}

export function ReportsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reports, setReports] = useState<FinancialReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ReportType>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [selectedReport, setSelectedReport] = useState<FinancialReportRow | null>(null)
  const [showReportDetail, setShowReportDetail] = useState(false)
  const [showYearEndProcessing, setShowYearEndProcessing] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchReports();
  }, []);

  // Check for action parameter to auto-open form
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setShowForm(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await reportsApi.getAll();

      if (error) {
        console.error('Error fetching reports:', error);
        setReports([]);
        toast.error('Gagal mengambil data laporan');
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error('Error:', error);
      setReports([]);
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

      if (!user?.id) {
        toast.error('Anda harus login untuk menyimpan laporan');
        return;
      }

      // Generate report from MySQL API
      const { data: generatedData, error: generateError } = await reportsApi.generate({
        periode_start: values.periode_start,
        periode_end: values.periode_end,
        tipe_laporan: values.tipe_laporan
      });

      if (generateError) {
        console.error('Error generating report:', generateError);
        toast.error('Gagal generate laporan');
        return;
      }

      // Save the generated report
      const { data: savedReport, error: saveError } = await reportsApi.create({
        periode_start: values.periode_start,
        periode_end: values.periode_end,
        tipe_laporan: values.tipe_laporan,
        total_pemasukan: generatedData?.total_pemasukan || 0,
        total_pengeluaran: generatedData?.total_pengeluaran || 0,
        saldo_akhir: generatedData?.saldo_akhir || 0,
        report_data: generatedData?.report_data,
        data_source: 'mysql',
        transaction_count: generatedData?.report_data?.transaction_count || 0
      });

      if (saveError) {
        console.error('Error saving report:', saveError);
        toast.error('Gagal menyimpan laporan');
        return;
      }

      setReports(prev => [savedReport!, ...prev]);
      setShowForm(false);
      toast.success('Laporan berhasil dibuat');

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
      const { error } = await reportsApi.delete(reportId);

      if (error) {
        console.error('Error deleting report:', error);
        toast.error('Gagal menghapus laporan');
        return;
      }

      setReports(prevReports => prevReports.filter(report => report.id !== reportId));
      toast.success('Laporan berhasil dihapus');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus laporan');
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = async (report: FinancialReportRow) => {
    try {
      toast.loading('Menghasilkan laporan PDF...');

      await generateReportPDF(
        {
          id: report.id,
          periode_start: report.periode_start,
          periode_end: report.periode_end,
          tipe_laporan: report.tipe_laporan,
          total_pemasukan: report.total_pemasukan,
          total_pengeluaran: report.total_pengeluaran,
          saldo_akhir: report.saldo_akhir,
          report_data: report.report_data
        },
        '/Logo KP2A-Fix.png'
      );

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getReportTypeLabel = (type: ReportType) => {
    switch (type) {
      case 'bulanan': return 'Bulanan';
      case 'triwulan': return 'Triwulan';
      case 'tahunan': return 'Tahunan';
    }
  };

  const getReportTypeColor = (type: ReportType) => {
    switch (type) {
      case 'bulanan': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'triwulan': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'tahunan': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Laporan Keuangan</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowYearEndProcessing(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <FaCog size={18} />
            <span>Proses Akhir Tahun</span>
          </button>
          <button
            onClick={handleAddReport}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <FaPlus size={18} />
            <span>Buat Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | ReportType)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Semua Tipe</option>
            <option value="bulanan">Bulanan</option>
            <option value="triwulan">Triwulan</option>
            <option value="tahunan">Tahunan</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FaFile className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Tidak ada laporan</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Mulai dengan membuat laporan keuangan baru.
            </p>
            <div className="mt-6">
              <button
                onClick={handleAddReport}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
              >
                <FaPlus size={16} />
                Buat Laporan
              </button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Pemasukan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Pengeluaran
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(report.periode_start).toLocaleDateString('id-ID')} - {new Date(report.periode_end).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReportTypeColor(report.tipe_laporan)}`}>
                      {getReportTypeLabel(report.tipe_laporan)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                    {formatCurrency(report.total_pemasukan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                    {formatCurrency(report.total_pengeluaran)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(report.saldo_akhir)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400"
                        title="Lihat Detail"
                      >
                        <FaEye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(report)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Download PDF"
                      >
                        <FaDownload size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        title="Hapus"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Buat Laporan Baru
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="p-4">
                <ReportsForm
                  onSubmit={handleSubmitReport}
                  onCancel={() => setShowForm(false)}
                  loading={loading}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showReportDetail && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Detail Laporan
                </h2>
                <button
                  onClick={() => setShowReportDetail(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Periode</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(selectedReport.periode_start).toLocaleDateString('id-ID')} - {new Date(selectedReport.periode_end).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tipe Laporan</p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getReportTypeColor(selectedReport.tipe_laporan)}`}>
                        {getReportTypeLabel(selectedReport.tipe_laporan)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Pemasukan</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedReport.total_pemasukan)}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Pengeluaran</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(selectedReport.total_pengeluaran)}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Akhir</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(selectedReport.saldo_akhir)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedReport.report_data?.periode && (
                    <div className="border-t dark:border-gray-700 pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Rincian Pendapatan</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Iuran Wajib</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(selectedReport.report_data.periode.iuran_wajib || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Simpanan Sukarela</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(selectedReport.report_data.periode.simpanan_sukarela || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Simpanan Wajib</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(selectedReport.report_data.periode.simpanan_wajib || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pembayaran Pinjaman</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(selectedReport.report_data.periode.pembayaran_pinjaman || 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => handleDownloadPDF(selectedReport)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                  >
                    <FaDownload size={16} />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowReportDetail(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Year End Processing Modal */}
      <AnimatePresence>
        {showYearEndProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Proses Akhir Tahun
                </h2>
                <button
                  onClick={() => setShowYearEndProcessing(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="p-4">
                <YearEndProcessing onClose={() => setShowYearEndProcessing(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
