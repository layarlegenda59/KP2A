import React, { useEffect, useMemo, useState } from 'react'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaCalendar, FaDollarSign } from 'react-icons/fa'
import { LoanPayment, Loan, Member } from '../../types'
import { loansApi } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { LoanPaymentForm } from './LoanPaymentForm'
import { LoanPaymentFormValues } from '../../schemas/loanPaymentSchema'
import { useAuth } from '../../contexts/AuthContext'

type StatusFilter = 'all' | 'lunas' | 'terlambat'

export function LoanPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<(LoanPayment & { loan?: Loan & { member?: Member } })[]>([])
  const [loans, setLoans] = useState<(Loan & { member?: Member })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LoanPayment & { loan?: Loan & { member?: Member } } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedLoanId, setSelectedLoanId] = useState<string>('')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      // Fetch active loans from MySQL backend
      const { data: loansData, error: loansError } = await loansApi.getAll({ status: 'aktif' })
      if (loansError) throw new Error(loansError)

      // Map the loans data to the expected format
      const mappedLoans = (loansData || []).map((loan: any) => ({
        ...loan,
        id: loan.id,
        member_id: loan.member_id,
        jumlah_pinjaman: Number(loan.jumlah_pinjaman || 0),
        angsuran_bulanan: Number(loan.angsuran_bulanan || 0),
        sisa_pinjaman: Number(loan.sisa_pinjaman || 0),
        bunga_persen: Number(loan.bunga_persen || 0),
        tenor_bulan: Number(loan.tenor_bulan || 0),
        member: loan.nama_lengkap ? {
          id: loan.member_id,
          nama_lengkap: loan.nama_lengkap,
          id_anggota: loan.id_anggota
        } : undefined
      }))
      setLoans(mappedLoans)

      // Fetch payments for all loans
      const allPayments: any[] = []
      for (const loan of mappedLoans) {
        const { data: loanPayments, error: paymentsError } = await loansApi.getPayments(loan.id)
        if (!paymentsError && loanPayments) {
          allPayments.push(...loanPayments.map((payment: any) => ({
            ...payment,
            loan: loan
          })))
        }
      }
      setPayments(allPayments)
    } catch (err) {
      console.error('Failed to fetch loan data:', err)
      toast.error('Gagal memuat data pinjaman')
      setLoans([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedLoanId) {
      fetchAll()
    }
  }, [selectedLoanId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter((p) => {
      const matchStatus = status === 'all' ? true : p.status === status
      const matchSearch = q
        ? (p.loan?.member?.nama_lengkap || '').toLowerCase().includes(q)
        : true
      return matchStatus && matchSearch
    })
  }, [payments, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (values: LoanPaymentFormValues) => {
    const payload = {
      loan_id: values.loan_id,
      angsuran_ke: values.angsuran_ke,
      angsuran_pokok: values.angsuran_pokok,
      angsuran_bunga: values.angsuran_bunga || 0,
      sisa_angsuran: values.sisa_angsuran,
      tanggal_bayar: values.tanggal_bayar,
      status: values.status,
    }

    try {
      // Call API to create payment
      const { data, error } = await loansApi.addPayment(values.loan_id, payload)
      if (error) throw new Error(error)

      toast.success('Pembayaran angsuran berhasil disimpan')
      setShowForm(false)
      await fetchAll() // Use await to ensure data is refreshed
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan pembayaran angsuran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<LoanPaymentFormValues>) => {
    try {
      if (!editing) {
        throw new Error('No payment to update')
      }

      // Call API to update payment
      const { data, error } = await loansApi.updatePayment(editing.loan_id, id, values)
      if (error) throw new Error(error)

      toast.success('Pembayaran angsuran diperbarui')
      setEditing(null)
      setShowForm(false)
      await fetchAll() // Use await to ensure data is refreshed
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui pembayaran angsuran')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Find the payment to get the loan_id
      const paymentToDelete = payments.find((p) => p.id === id)
      if (!paymentToDelete) {
        throw new Error('Pembayaran tidak ditemukan')
      }

      // Call API to delete payment - this will also update sisa_pinjaman in backend
      const { error } = await loansApi.deletePayment(paymentToDelete.loan_id, id)
      if (error) throw new Error(error)

      toast.success('Pembayaran angsuran dihapus')
      setConfirmDeleteId(null)

      // Refresh all data to get updated sisa_pinjaman - use await to ensure completion
      await fetchAll()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pembayaran angsuran')
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return months[month - 1] || ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <FaDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Angsuran</h1>
          <p className="text-gray-600 dark:text-gray-400">Kelola pembayaran angsuran pinjaman anggota</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <FaSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari nama anggota..."
              className="pl-9 pr-3 py-2 w-72 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FaCalendar className="h-4 w-4 text-gray-400" />
            <select
              value={selectedLoanId}
              onChange={(e) => { setSelectedLoanId(e.target.value); setPage(1) }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-2 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Pinjaman</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.member?.nama_lengkap} - Rp {Number(loan.jumlah_pinjaman).toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={async () => {
            await fetchAll() // Refresh data to get latest sisa_pinjaman
            setEditing(null)
            setShowForm(true)
          }}
          className="btn btn-primary gap-2"
        >
          <FaPlus className="h-4 w-4" /> Tambah Angsuran
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Angsuran Ke</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pokok</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jasa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sisa Angsuran</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal Bayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data pembayaran angsuran
                  </td>
                </tr>
              ) : (
                pageItems.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {payment.loan?.member?.nama_lengkap || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {payment.angsuran_ke}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      Rp {Number(payment.angsuran_pokok || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      Rp {Number(payment.angsuran_bunga || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      Rp {Number(payment.sisa_angsuran || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {new Date(payment.tanggal_bayar).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'lunas' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            await fetchAll() // Refresh data to get latest sisa_pinjaman
                            setEditing(payment)
                            setShowForm(true)
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Edit"
                        >
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(payment.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Hapus"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => { setShowForm(false); setEditing(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[720px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editing ? 'Edit Angsuran' : 'Tambah Angsuran'}
                </h3>
                <button
                  onClick={() => { setShowForm(false); setEditing(null) }}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <LoanPaymentForm
                  initial={editing || undefined}
                  loans={loans}
                  onCancel={() => { setShowForm(false); setEditing(null) }}
                  onSubmit={async (values) => {
                    if (editing) {
                      await handleUpdate(editing.id, values)
                    } else {
                      await handleCreate(values)
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus Pembayaran Angsuran?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Data pembayaran angsuran akan dihapus secara permanen dan tidak dapat dikembalikan.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Hapus
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
