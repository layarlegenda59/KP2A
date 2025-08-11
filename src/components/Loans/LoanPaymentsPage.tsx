import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, X, AlertTriangle, Calendar, DollarSign } from 'lucide-react'
import { LoanPayment, Loan, Member } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { LoanPaymentForm, LoanPaymentFormValues } from './LoanPaymentForm'
import { useAuth } from '../../contexts/AuthContext'
import { createLoanPaymentReminderNotification } from '../../utils/notificationHelpers'

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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      // Fetch active loans with member info
      const loansRes = await withTimeout(
        supabase
          .from('loans')
          .select('id, member_id, jumlah_pinjaman, angsuran_bulanan, sisa_pinjaman, bunga_persen, tenor_bulan, tanggal_pinjaman, status, created_at, member:members(id, nama_lengkap)')
          .eq('status', 'aktif')
          .order('created_at', { ascending: false }),
        6000,
        'fetch active loans'
      )
      if (loansRes.error) throw loansRes.error
      
      // Normalize loans data to ensure proper number conversion
        const normalizedLoans = (loansRes.data as any[]).map((loan) => ({
          ...loan,
          jumlah_pinjaman: Number(loan.jumlah_pinjaman || 0),
          angsuran_bulanan: Number(loan.angsuran_bulanan || 0),
          sisa_pinjaman: Number(loan.sisa_pinjaman || 0),
          bunga_persen: Number(loan.bunga_persen || 0),
          tenor_bulan: Number(loan.tenor_bulan || 0)
        }))
      setLoans(normalizedLoans)

      // Fetch loan payments with loan and member info
      let paymentsQuery = supabase
        .from('loan_payments')
        .select(`
          *,
          loan:loans(
            id,
            member_id,
            jumlah_pinjaman,
            angsuran_bulanan,
            tanggal_pinjaman,
            status,
            member:members(id, nama_lengkap)
          )
        `)
        .order('created_at', { ascending: false })

      if (selectedLoanId) {
        paymentsQuery = paymentsQuery.eq('loan_id', selectedLoanId)
      }

      const paymentsRes = await withTimeout(paymentsQuery, 6000, 'fetch loan payments')
      if (paymentsRes.error) throw paymentsRes.error

      const normalizedPayments = (paymentsRes.data as any[]).map((p) => ({
        ...p,
        angsuran_pokok: Number(p.angsuran_pokok),
        angsuran_bunga: Number(p.angsuran_bunga || 0),
        total_angsuran: Number(p.total_angsuran),
      }))
      setPayments(normalizedPayments)
    } catch (err) {
      console.error('Failed to fetch loan payments:', err)
      // Fallback to demo data when Supabase is not available
      setPayments([])
      setLoans([
        {
          id: 'demo-loan-1',
          member_id: 'demo-member-1',
          jumlah_pinjaman: 5000000,
          angsuran_bulanan: 442450,
          sisa_pinjaman: 2650000,
          bunga_persen: 2.0,
          tenor_bulan: 12,
          tanggal_pinjaman: '2024-01-10',
          status: 'aktif',
          created_at: '2024-01-10T00:00:00Z',
          member: {
            id: 'demo-member-1',
            nama_lengkap: 'Ahmad Rahman'
          }
        },
        {
          id: 'demo-loan-2',
          member_id: 'demo-member-2',
          jumlah_pinjaman: 3000000,
          angsuran_bulanan: 331470,
          sisa_pinjaman: 2000000,
          bunga_persen: 2.0,
          tenor_bulan: 10,
          tanggal_pinjaman: '2024-02-15',
          status: 'aktif',
          created_at: '2024-02-15T00:00:00Z',
          member: {
            id: 'demo-member-2',
            nama_lengkap: 'Maria Susanti'
          }
        },
        {
          id: 'demo-loan-3',
          member_id: 'demo-member-3',
          jumlah_pinjaman: 2000000,
          angsuran_bulanan: 349560,
          sisa_pinjaman: 1050000,
          bunga_persen: 1.5,
          tenor_bulan: 6,
          tanggal_pinjaman: '2024-03-20',
          status: 'aktif',
          created_at: '2024-03-20T00:00:00Z',
          member: {
            id: 'demo-member-3',
            nama_lengkap: 'Dedi Kurniawan'
          }
        }
      ])
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
      total_angsuran: values.total_angsuran,
      tanggal_bayar: values.tanggal_bayar,
      status: values.status,
    }

    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      // Insert payment
      const insertRes = await withTimeout(
        supabase.from('loan_payments').insert(payload).select('*').single(),
        8000,
        'insert loan payment'
      )
      if (insertRes.error) throw insertRes.error

      // Update loan's remaining balance
      const loan = loans.find(l => l.id === values.loan_id)
      if (loan) {
        const newSisaPinjaman = Math.max(0, Number(loan.sisa_pinjaman) - values.angsuran_pokok)
        const newStatus = newSisaPinjaman === 0 ? 'lunas' : 'aktif'
        
        await withTimeout(
          supabase
            .from('loans')
            .update({ 
              sisa_pinjaman: newSisaPinjaman,
              status: newStatus
            })
            .eq('id', values.loan_id),
          6000,
          'update loan balance'
        )
      }

      // Create notification for loan payment
      if (user?.id) {
        const loan = loans.find(l => l.id === values.loan_id)
        if (loan?.member?.nama_lengkap) {
          await createLoanPaymentReminderNotification(
            user.id,
            loan.member.nama_lengkap,
            values.angsuran_ke,
            values.total_angsuran
          )
        }
      }

      toast.success('Pembayaran angsuran berhasil disimpan')
      setShowForm(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan pembayaran angsuran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<LoanPaymentFormValues>) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      const updateRes = await withTimeout(
        supabase.from('loan_payments').update(values).eq('id', id).select('*').single(),
        8000,
        'update loan payment'
      )
      if (updateRes.error) throw updateRes.error

      toast.success('Pembayaran angsuran diperbarui')
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui pembayaran angsuran')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      const deleteRes = await withTimeout(
        supabase.from('loan_payments').delete().eq('id', id),
        6000,
        'delete loan payment'
      )
      if (deleteRes.error) throw deleteRes.error

      setPayments((prev) => prev.filter((p) => p.id !== id))
      toast.success('Pembayaran angsuran dihapus')
      setConfirmDeleteId(null)
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
        <div className="p-2 bg-blue-100 rounded-lg">
          <DollarSign className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Angsuran Pinjaman</h1>
          <p className="text-gray-600">Kelola pembayaran angsuran pinjaman anggota</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari nama anggota..."
              className="pl-9 pr-3 py-2 w-72 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }}
              className="border border-gray-300 rounded-lg px-2 py-2"
            >
              <option value="all">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={selectedLoanId}
              onChange={(e) => { setSelectedLoanId(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-2 py-2 min-w-[200px]"
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
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Tambah Pembayaran
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Angsuran Ke</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pokok</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bunga</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Bayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data pembayaran angsuran
                  </td>
                </tr>
              ) : (
                pageItems.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.loan?.member?.nama_lengkap || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {payment.angsuran_ke}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rp {Number(payment.angsuran_pokok || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rp {Number(payment.angsuran_bunga || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rp {Number(payment.total_angsuran || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(payment.tanggal_bayar).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'lunas' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditing(payment); setShowForm(true) }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(payment.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700">
              {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
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
              className="bg-white rounded-xl shadow-xl w-[720px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Edit Pembayaran Angsuran' : 'Tambah Pembayaran Angsuran'}
                </h3>
                <button
                  onClick={() => { setShowForm(false); setEditing(null) }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
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
              className="bg-white rounded-xl shadow-xl w-[440px] max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Hapus Pembayaran Angsuran?</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Data pembayaran angsuran akan dihapus secara permanen dan tidak dapat dikembalikan.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
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