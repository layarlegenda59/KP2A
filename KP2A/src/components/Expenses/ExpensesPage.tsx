import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaCheck } from 'react-icons/fa'
import { Expense } from '../../types'
import { expensesApi } from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { ExpensesForm, ExpensesFormValues } from './ExpensesForm'
import { useAuth } from '../../contexts/AuthContext'
import { createExpenseApprovalNotification } from '../../utils/notificationHelpers'

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue'

export function ExpensesPage() {
  const { user, isDemo } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [transactionType, setTransactionType] = useState<'all' | 'credit' | 'debit'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Detect transaction type from current route
  useEffect(() => {
    if (location.pathname === '/expenses/credit') {
      setTransactionType('credit')
    } else if (location.pathname === '/expenses/debit') {
      setTransactionType('debit')
    } else {
      setTransactionType('all')
    }
  }, [location.pathname])

  // Set transaction type from URL query on component mount
  useEffect(() => {
    const type = searchParams.get('type') as 'credit' | 'debit' | null
    if (type) {
      setTransactionType(type)
    }
  }, [searchParams])

  useEffect(() => {
    fetchAll()
  }, [transactionType])

  // Check for action parameter to auto-open form
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setEditing(null)
      setShowForm(true)
      // Remove the action parameter from URL
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data, error } = await expensesApi.getAll()

      if (error) throw new Error(error)

      const items = data || []

      const normalized = items.map((d: any) => ({
        ...d,
        kategori: d.kategori || d.expense_categories?.name || 'Unknown',
        deskripsi: d.deskripsi || d.notes || '',
        jumlah: Number(d.jumlah || d.amount),
        tanggal: d.tanggal || d.payment_date,
        status_otorisasi: d.status_otorisasi || d.status,
      }))
      setItems(normalized)
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      setItems([])
      toast((t) => (
        <div className="flex items-start">
          <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat pengeluaran</p>
            <p className="text-xs text-gray-600">Terjadi kesalahan pada server</p>
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

  // Removed getCategoryId as it's handled by backend or not needed in this form

  const handleCreate = async (values: ExpensesFormValues) => {
    // Basic validation
    if (!values.kategori || !values.jumlah || !values.tanggal) {
      toast.error('Mohon lengkapi data')
      return
    }

    const payload = {
      category_name: values.kategori, // Backend should handle category lookup/creation
      notes: values.deskripsi,
      amount: values.jumlah,
      payment_date: values.tanggal,
      status: values.status_otorisasi,
    }

    try {
      const { data, error } = await expensesApi.create(payload)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const newItem = data

      // Normalize for frontend
      const normalized = {
        ...newItem,
        kategori: newItem.kategori || (newItem as any).expense_categories?.name || values.kategori,
        deskripsi: newItem.deskripsi || (newItem as any).notes || '',
        jumlah: Number(newItem.jumlah || (newItem as any).amount),
        tanggal: newItem.tanggal || (newItem as any).payment_date,
        status_otorisasi: newItem.status_otorisasi || (newItem as any).status,
      }

      setItems((prev) => [normalized, ...prev])

      // Create notification for expense approval
      if (user?.id && normalized.status_otorisasi === 'approved') {
        await createExpenseApprovalNotification(
          user.id,
          normalized.kategori,
          normalized.jumlah
        )
      }

      toast.success('Pengeluaran berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan pengeluaran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<ExpensesFormValues>) => {
    try {
      const payload: any = {}

      // Map frontend fields to payload
      if (values.deskripsi !== undefined) payload.notes = values.deskripsi
      if (values.jumlah !== undefined) payload.amount = values.jumlah
      if (values.tanggal !== undefined) payload.payment_date = values.tanggal
      if (values.status_otorisasi !== undefined) payload.status = values.status_otorisasi
      if (values.kategori !== undefined) payload.category_name = values.kategori

      const { data, error } = await expensesApi.update(id, payload)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const updatedItem = data

      // Normalize for frontend
      const normalized = {
        ...updatedItem,
        kategori: updatedItem.kategori || (updatedItem as any).expense_categories?.name || values.kategori || 'Unknown',
        deskripsi: updatedItem.deskripsi || (updatedItem as any).notes || '',
        jumlah: Number(updatedItem.jumlah || (updatedItem as any).amount),
        tanggal: updatedItem.tanggal || (updatedItem as any).payment_date,
        status_otorisasi: updatedItem.status_otorisasi || (updatedItem as any).status,
      }

      setItems((prev) => prev.map((e) => (e.id === id ? normalized : e)))

      toast.success('Pengeluaran diperbarui')
      setEditing(null)
      setShowForm(false)
    } catch (err: any) {
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await expensesApi.delete(id)

      if (error) throw new Error(error)

      const next = items.filter((e) => e.id !== id)
      setItems(next)

      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Pengeluaran dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pengeluaran')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    try {
      // API doesn't support bulk delete yet, do sequential
      const idsArray = Array.from(selectedIds)

      // Execute in parallel
      await Promise.all(idsArray.map(id => expensesApi.delete(id)))

      const next = items.filter((e) => !selectedIds.has(e.id))
      setItems(next)
      setSelectedIds(new Set())

      toast.success(`${idsArray.length} pengeluaran berhasil dihapus`)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pengeluaran')
    } finally {
      setConfirmBulkDelete(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === pageItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pageItems.map(item => item.id)))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const isAllSelected = pageItems.length > 0 && selectedIds.size === pageItems.length
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < pageItems.length

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
            <FaSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari deskripsi/kategori..."
              className="pl-9 pr-3 py-2 w-72 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <select value={category} onChange={(e) => { setCategory(e.target.value as any); setPage(1) }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Jumlah Total: <span className="font-semibold">Rp {totalAll.toLocaleString('id-ID')}</span>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-700 flex items-center gap-2"
            >
              <FaTrash className="h-4 w-4" /> Hapus {selectedIds.size} Item
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FaPlus className="h-4 w-4" /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <div className="flex items-center">
                    <button
                      onClick={handleSelectAll}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isAllSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isPartiallySelected
                          ? 'bg-blue-100 border-blue-600 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      {isAllSelected && <FaCheck className="h-3 w-3" />}
                      {isPartiallySelected && !isAllSelected && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Deskripsi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((e) => (
                  <tr key={e.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(e.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectItem(e.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(e.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        {selectedIds.has(e.id) && <FaCheck className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{e.kategori}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{e.deskripsi}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Rp {Number(e.jumlah || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(e.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status_otorisasi === 'paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        e.status_otorisasi === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>{e.status_otorisasi}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(e); setShowForm(true) }} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Edit">
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(e.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Hapus">
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={7}>Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1">
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded disabled:opacity-50">Prev</button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Page</span>
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
                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">of {totalPages}</span>
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditing(null) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[680px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <FaTimes className="h-5 w-5" />
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus Pengeluaran?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Batal</button>
                  <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Hapus</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Bulk Delete */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmBulkDelete(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus {selectedIds.size} Pengeluaran?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">Batal</button>
                  <button onClick={handleBulkDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Hapus {selectedIds.size} Item</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


