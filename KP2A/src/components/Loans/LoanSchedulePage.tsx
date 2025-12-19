import React, { useEffect, useMemo, useState } from 'react'
import { FaCalendar, FaDollarSign, FaSearch, FaFilter, FaFile, FaDownload, FaExclamationTriangle } from 'react-icons/fa'
import { Loan, Member, LoanPayment } from '../../types'
import { isDatabaseAvailable, databaseClient } from '../../lib/database'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

type ViewMode = 'table' | 'calendar'

interface LoanScheduleItem {
  loan: Loan & { member?: Member }
  payments: LoanPayment[]
  monthlySchedule: {
    month: number
    monthName: string
    expectedAmount: number
    paidAmount: number
    status: 'paid' | 'pending' | 'overdue'
    paymentDate?: string
  }[]
}

export function LoanSchedulePage() {
  const [scheduleData, setScheduleData] = useState<LoanScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchScheduleData()
  }, [selectedYear])

  const fetchScheduleData = async () => {
    setLoading(true)
    try {
      if (!isDatabaseAvailable()) {
        throw new Error('Koneksi database tidak tersedia')
      }

      // Fetch active loans with member info
      const loansRes = await databaseClient
        .from('loans')
        .select('*, member:members(id, nama_lengkap)')
        .eq('status', 'aktif')
        .order('created_at', { ascending: false })
        
      
      if (loansRes.error) throw loansRes.error

      // Fetch all loan payments for the selected year
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`
      
      const paymentsRes = await databaseClient
        .from('loan_payments')
        .select('*')
        .gte('tanggal_bayar', startDate)
        .lte('tanggal_bayar', endDate)
        
      if (paymentsRes.error) throw paymentsRes.error

      // Normalize loans data to ensure proper number conversion
      const loans = (loansRes.data as any[]).map((loan) => ({
        ...loan,
        jumlah_pinjaman: Number(loan.jumlah_pinjaman || 0),
        angsuran_bulanan: Number(loan.angsuran_bulanan || 0),
        sisa_pinjaman: Number(loan.sisa_pinjaman || 0),
        bunga_persen: Number(loan.bunga_persen || 0),
        tenor_bulan: Number(loan.tenor_bulan || 0)
      })) as (Loan & { member?: Member })[]
      
      const payments = paymentsRes.data as LoanPayment[]

      // Generate schedule for each loan
      const scheduleItems: LoanScheduleItem[] = loans.map(loan => {
        const loanPayments = payments.filter(p => p.loan_id === loan.id)
        const monthlySchedule = []

        for (let month = 1; month <= 12; month++) {
          const monthName = getMonthName(month)
          const expectedAmount = Number(loan.angsuran_bulanan)
          
          // Find payments for this month
          const monthPayments = loanPayments.filter(p => {
            const paymentDate = new Date(p.tanggal_bayar)
            return paymentDate.getMonth() + 1 === month && paymentDate.getFullYear() === selectedYear
          })

          const paidAmount = monthPayments.reduce((sum, p) => sum + Number(p.total_angsuran), 0)
          const hasPayment = monthPayments.length > 0
          const latestPayment = monthPayments.sort((a, b) => 
            new Date(b.tanggal_bayar).getTime() - new Date(a.tanggal_bayar).getTime()
          )[0]

          let status: 'paid' | 'pending' | 'overdue' = 'pending'
          if (hasPayment && paidAmount >= expectedAmount) {
            status = 'paid'
          } else if (new Date() > new Date(selectedYear, month, 0)) {
            // Month has passed without full payment
            status = 'overdue'
          }

          monthlySchedule.push({
            month,
            monthName,
            expectedAmount,
            paidAmount,
            status,
            paymentDate: latestPayment?.tanggal_bayar
          })
        }

        return {
          loan,
          payments: loanPayments,
          monthlySchedule
        }
      })

      setScheduleData(scheduleItems)
    } catch (err) {
      console.error('Failed to fetch schedule data:', err)
      setScheduleData([])
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return months[month - 1] || ''
  }

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scheduleData.filter(item => {
      const matchSearch = q ? (item.loan.member?.nama_lengkap || '').toLowerCase().includes(q) : true
      
      if (statusFilter === 'all') return matchSearch
      
      const hasStatus = item.monthlySchedule.some(schedule => schedule.status === statusFilter)
      return matchSearch && hasStatus
    })
  }, [scheduleData, search, statusFilter])

  const exportToCSV = () => {
    const csvData = []
    
    // Header row matching the template
    csvData.push([
      'id_anggota',
      'nama_anggota',
      'bayar_angsuran_januari',
      'bayar_angsuran_februari', 
      'bayar_angsuran_maret',
      'bayar_angsuran_april',
      'bayar_angsuran_mei',
      'bayar_angsuran_juni',
      'bayar_angsuran_juli',
      'bayar_angsuran_agustus',
      'bayar_angsuran_september',
      'bayar_angsuran_oktober',
      'bayar_angsuran_november',
      'bayar_angsuran_desember',
      'jumlah_pinjaman',
      'sisa_pinjaman',
      'tanggal_pinjam',
      'jangka_waktu',
      'bunga',
      'status'
    ])

    // Data rows
    filteredData.forEach(item => {
      const row = [
        item.loan.member?.id || '',
        item.loan.member?.nama_lengkap || '',
        ...item.monthlySchedule.map(schedule => 
          schedule.paidAmount > 0 ? schedule.paidAmount.toLocaleString('id-ID') : ''
        ),
        Number(item.loan.jumlah_pinjaman).toLocaleString('id-ID'),
        Number(item.loan.sisa_pinjaman).toLocaleString('id-ID'),
        new Date(item.loan.tanggal_pinjaman).toLocaleDateString('id-ID'),
        item.loan.tenor_bulan,
        item.loan.bunga_persen,
        item.loan.status
      ]
      csvData.push(row)
    })

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `jadwal-angsuran-${selectedYear}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Data jadwal angsuran berhasil diexport')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <FaCalendar className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Angsuran Pinjaman</h1>
          <p className="text-gray-600">Pantau jadwal pembayaran angsuran pinjaman anggota</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <FaSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama anggota..."
              className="pl-9 pr-3 py-2 w-72 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-2 py-2"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="pending">Pending</option>
              <option value="overdue">Terlambat</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FaCalendar className="h-4 w-4 text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-2"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <option key={year} value={year}>{year}</option>
                )
              })}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaDownload className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Nama Anggota
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah Pinjaman
                </th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {getMonthName(i + 1)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Dibayar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sisa Pinjaman
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data jadwal angsuran
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const totalPaid = item.monthlySchedule.reduce((sum, schedule) => sum + schedule.paidAmount, 0)
                  
                  return (
                    <tr key={item.loan.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {item.loan.member?.nama_lengkap || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Rp {Number(item.loan.jumlah_pinjaman).toLocaleString('id-ID')}
                      </td>
                      {item.monthlySchedule.map((schedule, monthIndex) => (
                        <td key={monthIndex} className="px-3 py-3 text-center text-sm">
                          <div className="space-y-1">
                            {schedule.paidAmount > 0 ? (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                schedule.status === 'paid' ? 'bg-green-100 text-green-800' :
                                schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                Rp {schedule.paidAmount.toLocaleString('id-ID')}
                              </div>
                            ) : (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {schedule.status === 'overdue' ? 'Terlambat' : '-'}
                              </div>
                            )}
                            {schedule.paymentDate && (
                              <div className="text-xs text-gray-500">
                                {new Date(schedule.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        Rp {totalPaid.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Rp {Number(item.loan.sisa_pinjaman).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaFile className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pinjaman Aktif</p>
              <p className="text-xl font-bold text-gray-900">{filteredData.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaDollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Terkumpul</p>
              <p className="text-xl font-bold text-gray-900">
                Rp {filteredData.reduce((sum, item) => 
                  sum + item.monthlySchedule.reduce((monthSum, schedule) => monthSum + schedule.paidAmount, 0), 0
                ).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FaCalendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Bulan Ini</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredData.reduce((count, item) => {
                  const currentMonth = new Date().getMonth() + 1
                  const currentSchedule = item.monthlySchedule.find(s => s.month === currentMonth)
                  return count + (currentSchedule?.status === 'pending' ? 1 : 0)
                }, 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaExclamationTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Terlambat</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredData.reduce((count, item) => 
                  count + item.monthlySchedule.filter(s => s.status === 'overdue').length, 0
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}