import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { Loan, Member } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { LoansForm, LoansFormValues } from './LoansForm'
import { useAuth } from '../../contexts/AuthContext'
import { createLoanApprovalNotification } from '../../utils/notificationHelpers'

type StatusFilter = 'all' | 'aktif' | 'lunas' | 'pending' | 'ditolak'

// Demo data helpers removed

export function LoansPage() {
  const { user } = useAuth()
  const [loans, setLoans] = useState<(Loan & { member?: Member })[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Loan & { member?: Member } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      {
        const membersQ = withTimeout(
          supabase.from('members').select('id, nama_lengkap'),
          6000,
          'fetch members for loans'
        )

        let q = supabase
          .from('loans')
          .select('id, member_id, jumlah_pinjaman, bunga_persen, tenor_bulan, angsuran_bulanan, tanggal_pinjaman, status, sisa_pinjaman, created_at, updated_at, member:members(id, nama_lengkap)')
          .order('created_at', { ascending: false })

        if (status !== 'all') q = q.eq('status', status)

        // Fetch loan payments
        const paymentsQ = withTimeout(
          supabase.from('loan_payments').select('loan_id, total_angsuran'),
          6000,
          'fetch loan payments'
        )

        const [membersRes, loansRes, paymentsRes] = await Promise.all([membersQ, withTimeout(q, 6000, 'fetch loans'), paymentsQ])
        if (membersRes.error) throw membersRes.error
        if (loansRes.error) throw loansRes.error
        if (paymentsRes.error) throw paymentsRes.error

        setMembers((membersRes.data as Member[]) || [])
        
        // Calculate total payments for each loan
        const payments = paymentsRes.data || []
        const paymentsByLoan = payments.reduce((acc: Record<string, number>, payment: any) => {
          if (!acc[payment.loan_id]) acc[payment.loan_id] = 0
          acc[payment.loan_id] += Number(payment.total_angsuran || 0)
          return acc
        }, {})
        
        const normalized = (loansRes.data as any[]).map((d) => {
          const totalPaid = paymentsByLoan[d.id] || 0
          const actualSisaPinjaman = Math.max(0, Number(d.jumlah_pinjaman) - totalPaid)
          
          return {
            ...d,
            jumlah_pinjaman: Number(d.jumlah_pinjaman),
            bunga_persen: Number(d.bunga_persen),
            tenor_bulan: Number(d.tenor_bulan),
            angsuran_bulanan: Number(d.angsuran_bulanan),
            sisa_pinjaman: Number(d.sisa_pinjaman),
            total_paid: totalPaid, // Add total payments
            actual_sisa_pinjaman: actualSisaPinjaman // Add calculated remaining balance
          }
        })
        setLoans(normalized)
      }
    } catch (err) {
      console.error('Failed to fetch loans:', err)
      setMembers([])
      setLoans([])
      toast((t) => (
        <div className="flex items-start">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat pinjaman</p>
            <p className="text-xs text-gray-600">Berpindah ke mode demo (local)</p>
          </div>
        </div>
      ))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return loans.filter((l) => {
      const matchStatus = status === 'all' ? true : l.status === status
      const matchSearch = q ? (l.member?.nama_lengkap || '').toLowerCase().includes(q) : true
      return matchStatus && matchSearch
    })
  }, [loans, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (values: LoansFormValues) => {
    const payload = {
      member_id: values.member_id,
      jumlah_pinjaman: values.jumlah_pinjaman,
      bunga_persen: values.bunga_persen,
      tenor_bulan: values.tenor_bulan,
      angsuran_bulanan: values.angsuran_bulanan,
      tanggal_pinjaman: values.tanggal_pinjaman,
      status: values.status,
      sisa_pinjaman: values.sisa_pinjaman,
    }
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      {
        // Insert first (no relation in select), then fetch with relation
        const insertRes = await withTimeout(
          supabase.from('loans').insert(payload).select('*').single(),
          8000,
          'insert loan'
        )
        if (insertRes.error) throw insertRes.error

        const fetchRes = await withTimeout(
          supabase
            .from('loans')
            .select('*, member:members(id, nama_lengkap)')
            .eq('id', (insertRes.data as any).id)
            .single(),
          6000,
          'fetch created loan'
        )
        const data = (fetchRes.data || insertRes.data) as any
        const normalized = {
          ...data,
          jumlah_pinjaman: Number(data.jumlah_pinjaman),
          bunga_persen: Number(data.bunga_persen),
          tenor_bulan: Number(data.tenor_bulan),
          angsuran_bulanan: Number(data.angsuran_bulanan),
          sisa_pinjaman: Number(data.sisa_pinjaman),
        }
        setLoans((prev) => [normalized as any, ...prev])
        
        // Create notification for loan approval
        if (user?.id && normalized.status === 'aktif') {
          const memberName = normalized.member?.nama_lengkap || 'Anggota'
          await createLoanApprovalNotification(
            user.id,
            memberName,
            normalized.jumlah_pinjaman
          )
        }
      }
      toast.success('Pinjaman berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan pinjaman')
    }
  }

  const handleUpdate = async (id: string, values: Partial<LoansFormValues>) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      
      const updateRes = await withTimeout(
        supabase.from('loans').update(values).eq('id', id).select('*').single(),
        8000,
        'update loan'
      )
      if (updateRes.error) throw updateRes.error

      toast.success('Pinjaman diperbarui')
      setEditing(null)
      setShowForm(false)
      
      // Refresh all data to recalculate total_paid and actual_sisa_pinjaman
      fetchAll()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui pinjaman')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      const { error } = await withTimeout(
        supabase.from('loans').delete().eq('id', id),
        6000,
        'delete loan'
      )
      if (error) throw error
      
      const next = loans.filter((l) => l.id !== id)
      setLoans(next)
      toast.success('Pinjaman dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pinjaman')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
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
              <option value="aktif">Aktif</option>
              <option value="lunas">Lunas</option>
              <option value="pending">Pending</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" /> Tambah Pinjaman
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bunga (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenor (bulan)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Dibayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa Pinjaman</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{l.member?.nama_lengkap || l.member_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(l.jumlah_pinjaman || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{Number(l.bunga_persen || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.tenor_bulan}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(l.total_paid || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(l.actual_sisa_pinjaman || l.sisa_pinjaman || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(l.tanggal_pinjaman).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        l.status === 'aktif' ? 'bg-blue-100 text-blue-800' :
                        l.status === 'lunas' ? 'bg-green-100 text-green-800' :
                        l.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(l); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(l.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={9}>Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="border border-gray-300 rounded px-2 py-1">
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditing(null) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-[720px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Pinjaman' : 'Tambah Pinjaman'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <LoansForm
                  initial={editing || undefined}
                  members={members}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Hapus Pinjaman?</h4>
                    <p className="text-sm text-gray-600 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded border">Batal</button>
                  <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Hapus</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


