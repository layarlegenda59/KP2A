import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { Expense } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ExpensesForm, ExpensesFormValues } from './ExpensesForm'
import { useAuth } from '../../contexts/AuthContext'
import { createExpenseApprovalNotification } from '../../utils/notificationHelpers'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

// Demo data helpers removed

export function ExpensesPage() {
  const { user, isDemo } = useAuth()
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
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
        let q = supabase
          .from('expenses')
          .select('id, kategori, deskripsi, jumlah, tanggal, status_otorisasi, created_by, authorized_by, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (status !== 'all') q = q.eq('status_otorisasi', status)
        if (category !== 'all') q = q.eq('kategori', category)

        const res = await withTimeout(q, 7000, 'fetch expenses')
        if (res.error) throw res.error
        const normalized = (res.data as any[]).map((d) => ({
          ...d,
          jumlah: Number(d.jumlah),
        }))
        setItems(normalized)
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      setItems([])
      toast((t) => (
        <div className="flex items-start">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat pengeluaran</p>
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
    return items.filter((e) => {
      const matchStatus = status === 'all' ? true : e.status_otorisasi === status
      const matchCategory = category === 'all' ? true : e.kategori === category
      const matchSearch = q ? `${e.deskripsi} ${e.kategori}`.toLowerCase().includes(q) : true
      return matchStatus && matchCategory && matchSearch
    })
  }, [items, search, status, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (values: ExpensesFormValues) => {
    const payload: any = {
      kategori: values.kategori,
      deskripsi: values.deskripsi,
      jumlah: values.jumlah,
      tanggal: values.tanggal,
      status_otorisasi: values.status_otorisasi,
    }
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      if (!isDemo) {
        const session = await supabase!.auth.getSession()
        const uid = session.data.session?.user?.id
        if (uid) {
          payload.created_by = uid
          const insertRes = await withTimeout(
            supabase!.from('expenses').insert(payload).select('*').single(),
            8000,
            'insert expense'
          )
          if (insertRes.error) throw insertRes.error
          const data = insertRes.data as any
          data.jumlah = Number(data.jumlah)
          setItems((prev) => [data, ...prev])
          
          // Create notification for expense approval
          if (user?.id && data.status_otorisasi === 'approved') {
            await createExpenseApprovalNotification(
              user.id,
              data.kategori,
              data.jumlah
            )
          }
        } else {
          // No session: fallback to demo/local
          const now = new Date().toISOString()
          const newItem: Expense = {
            id: `e-${Date.now()}` as any,
            kategori: payload.kategori,
            deskripsi: payload.deskripsi,
            jumlah: payload.jumlah,
            tanggal: payload.tanggal,
            status_otorisasi: payload.status_otorisasi,
            created_by: user?.id || 'demo-user',
            created_at: now,
            updated_at: now,
          }
          const next = [newItem, ...items]
          setItems(next)
          saveDemoExpenses(next)
        }
      } else {
        throw new Error('Mode demo tidak diizinkan lagi, gunakan Supabase')
      }
      toast.success('Pengeluaran berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan pengeluaran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<ExpensesFormValues>) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      if (!isDemo) {
        const updateRes = await withTimeout(
          supabase!.from('expenses').update(values).eq('id', id).select('*').single(),
          8000,
          'update expense'
        )
        if (updateRes.error) throw updateRes.error
        const data = updateRes.data as any
        data.jumlah = Number(data.jumlah)
        setItems((prev) => prev.map((e) => (e.id === id ? data : e)))
      } else {
        throw new Error('Mode demo tidak diizinkan lagi, gunakan Supabase')
      }
      toast.success('Pengeluaran diperbarui')
      setEditing(null)
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui pengeluaran')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      const { error } = await withTimeout(
        supabase.from('expenses').delete().eq('id', id),
        6000,
        'delete expense'
      )
      if (error) throw error
      
      const next = items.filter((e) => e.id !== id)
      setItems(next)
      toast.success('Pengeluaran dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pengeluaran')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.kategori).filter(Boolean))
    return Array.from(set)
  }, [items])

  const totalAll = useMemo(() => {
    return filtered.reduce((acc, e) => acc + (e.jumlah || 0), 0)
  }, [filtered])

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
              placeholder="Cari deskripsi/kategori..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={category} onChange={(e) => { setCategory(e.target.value as any); setPage(1) }} className="border border-gray-300 rounded-lg px-2 py-2">
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Jumlah Total: <span className="font-semibold">Rp {totalAll.toLocaleString('id-ID')}</span>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4 mr-2" /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{e.kategori}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.deskripsi}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(e.jumlah || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(e.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        e.status_otorisasi === 'approved' ? 'bg-green-100 text-green-800' :
                        e.status_otorisasi === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>{e.status_otorisasi}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(e); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Tidak ada data</td>
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
            <div className="flex items-center gap-2">
              <span className="text-sm">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const newPage = parseInt(e.target.value)
                  if (newPage >= 1 && newPage <= totalPages) {
                    setPage(newPage)
                  }
                }}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm">of {totalPages}</span>
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditing(null) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-[680px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <ExpensesForm
                  initial={editing || undefined}
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
                    <h4 className="text-base font-semibold text-gray-900">Hapus Pengeluaran?</h4>
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


