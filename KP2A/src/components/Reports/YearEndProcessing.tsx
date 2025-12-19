import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaCalendar, FaFileAlt, FaExclamationTriangle, FaCheck, FaDownload, FaSync } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { 
  calculateYearEndSummary, 
  generateYearEndFinancialReport, 
  processNewYearLoanStatus,
  getUnpaidLoansFinancialImpact,
  YearEndSummary 
} from '../../utils/yearEndProcessing'
import { Loan } from '../../types'
import { formatCurrency } from '../../utils/numberFormat'

interface YearEndProcessingProps {
  onClose: () => void
}

export function YearEndProcessing({ onClose }: YearEndProcessingProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)
  const [yearEndSummary, setYearEndSummary] = useState<YearEndSummary | null>(null)
  const [financialImpact, setFinancialImpact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)

  const availableYears = Array.from({ length: 5 }, (_, i) => {
    const currentYear = new Date().getFullYear()
    return currentYear - i
  })

  useEffect(() => {
    if (selectedYear) {
      loadYearEndData()
    }
  }, [selectedYear])

  const loadYearEndData = async () => {
    try {
      setLoading(true)
      const [summary, impact] = await Promise.all([
        calculateYearEndSummary(selectedYear),
        getUnpaidLoansFinancialImpact(selectedYear)
      ])
      setYearEndSummary(summary)
      setFinancialImpact(impact)
    } catch (error) {
      console.error('Error loading year-end data:', error)
      toast.error('Gagal memuat data akhir tahun')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setProcessing(true)
      toast.loading('Membuat laporan akhir tahun...')
      
      const result = await generateYearEndFinancialReport(selectedYear)
      
      setReportGenerated(true)
      toast.dismiss()
      toast.success('Laporan akhir tahun berhasil dibuat')
      
      // Optionally download the report
      // You can implement PDF generation here
      
    } catch (error) {
      console.error('Error generating report:', error)
      toast.dismiss()
      toast.error('Gagal membuat laporan akhir tahun')
    } finally {
      setProcessing(false)
    }
  }

  const handleProcessNewYear = async () => {
    try {
      setProcessing(true)
      toast.loading('Memproses status pinjaman untuk tahun baru...')
      
      const result = await processNewYearLoanStatus(selectedYear)
      
      toast.dismiss()
      toast.success(result.message)
      
      // Reload data to reflect changes
      await loadYearEndData()
      
    } catch (error) {
      console.error('Error processing new year:', error)
      toast.dismiss()
      toast.error('Gagal memproses status pinjaman tahun baru')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaCalendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Proses Akhir Tahun</h2>
              <p className="text-gray-600">Kelola pinjaman belum lunas dan laporan keuangan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaCheck className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Year Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Pilih Tahun:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {yearEndSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaExclamationTriangle className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-800">Pinjaman Belum Lunas</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {yearEndSummary.totalOutstandingLoans}
                    </p>
                    <p className="text-sm text-orange-700">Total pinjaman</p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaFileAlt className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-800">Total Sisa Pinjaman</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {formatCurrency(yearEndSummary.totalUnpaidAmount)}
                    </p>
                    <p className="text-sm text-red-700">Belum terbayar</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaCalendar className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Tahun Laporan</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedYear}
                    </p>
                    <p className="text-sm text-blue-700">Periode akhir tahun</p>
                  </div>
                </div>
              )}

              {/* Unpaid Loans List */}
              {yearEndSummary && yearEndSummary.loansCarriedForward.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Daftar Pinjaman Belum Lunas</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama Anggota
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanggal Pinjaman
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah Pinjaman
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sisa Pinjaman
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {yearEndSummary.loansCarriedForward.map((loan) => (
                          <tr key={loan.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {loan.member?.nama_lengkap || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(loan.tanggal_pinjaman).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(loan.jumlah_pinjaman)}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600 font-medium">
                              {formatCurrency(loan.sisa_pinjaman || loan.jumlah_pinjaman)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Impact */}
              {financialImpact && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-3">Dampak Keuangan</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-700">
                      <strong>Pendapatan yang belum diterima:</strong> {formatCurrency(financialImpact.impact_on_cash_flow.expected_income_not_received)}
                    </p>
                    <p className="text-sm text-yellow-700">
                      <strong>Jumlah pinjaman tertunda:</strong> {financialImpact.impact_on_cash_flow.loans_count} pinjaman
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Rekomendasi:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {financialImpact.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={processing || !yearEndSummary}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaFileAlt className="h-4 w-4" />
                  {processing ? 'Membuat Laporan...' : 'Buat Laporan Akhir Tahun'}
                </button>
                
                <button
                  onClick={handleProcessNewYear}
                  disabled={processing || !yearEndSummary || yearEndSummary.totalOutstandingLoans === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaSync className="h-4 w-4" />
                  {processing ? 'Memproses...' : 'Proses Tahun Baru'}
                </button>
              </div>

              {reportGenerated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FaCheck className="h-5 w-5 text-green-600" />
                    <p className="text-green-800 font-medium">Laporan akhir tahun berhasil dibuat!</p>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Laporan telah disimpan dan dapat diakses melalui halaman Laporan Keuangan.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}