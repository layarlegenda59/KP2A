import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, X, AlertTriangle, Check } from 'lucide-react'
import { Due, Member } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { DuesForm, DuesFormValues } from './DuesForm'

type StatusFilter = 'all' | 'lunas' | 'belum_lunas'

// Demo data helpers removed

export function DuesPage() {
  const [dues, setDues] = useState<(Due & { member?: Member })[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [month, setMonth] = useState<number | 'all'>('all')
  const [year, setYear] = useState<number | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Due & { member?: Member } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
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
      const membersQ = withTimeout(
        supabase.from('members').select('id, nama_lengkap'),
        6000,
        'fetch members for dues'
      )

      let q = supabase
        .from('dues')
        .select('id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, tanggal_bayar, status, created_at, updated_at, member:members(id, nama_lengkap)')
        .order('created_at', { ascending: false })

      if (status !== 'all') q = q.eq('status', status)
      if (month !== 'all') q = q.eq('bulan', month)
      if (year !== 'all') q = q.eq('tahun', year)

      const [membersRes, duesRes] = await Promise.all([membersQ, withTimeout(q, 6000, 'fetch dues')])
      if (membersRes.error) throw membersRes.error
      if (duesRes.error) throw duesRes.error

      setMembers((membersRes.data as Member[]) || [])
      const normalized = (duesRes.data as any[]).map((d) => ({
        ...d,
        iuran_wajib: Number(d.iuran_wajib),
        iuran_sukarela: Number(d.iuran_sukarela),
      }))
      setDues(normalized)
    } catch (err) {
      console.error('Failed to fetch dues:', err)
      setMembers([])
      setDues([])
      toast((t) => (
        <div className="flex items-start">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat iuran</p>
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
    return dues.filter((d) => {
      const matchStatus = status === 'all' ? true : d.status === status
      const matchMonth = month === 'all' ? true : d.bulan === month
      const matchYear = year === 'all' ? true : d.tahun === year
      const matchSearch = q ? (d.member?.nama_lengkap || '').toLowerCase().includes(q) : true
      return matchStatus && matchMonth && matchYear && matchSearch
    })
  }, [dues, search, status, month, year])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (values: DuesFormValues) => {
    const payload = {
      member_id: values.member_id,
      bulan: values.bulan,
      tahun: values.tahun,
      iuran_wajib: values.iuran_wajib,
      iuran_sukarela: values.iuran_sukarela,
      tanggal_bayar: values.tanggal_bayar,
      status: values.status,
    }
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
        // Try INSERT first
        let writeRes = await withTimeout(
          supabase.from('dues').insert(payload).select('*').single(),
          8000,
          'insert dues'
        )
        // If duplicate (unique constraint), perform UPDATE by composite key
        if (writeRes.error && (writeRes as any).status === 409) {
          writeRes = await withTimeout(
            supabase
              .from('dues')
              .update(payload)
              .match({ member_id: payload.member_id, bulan: payload.bulan, tahun: payload.tahun })
              .select('*')
              .single(),
            8000,
            'update dues by composite key'
          )
        }
        if (writeRes.error) throw writeRes.error

        // Fetch newly written row with relation
        const fetchRes = await withTimeout(
          supabase
            .from('dues')
            .select('*, member:members(id, nama_lengkap)')
            .eq('id', (writeRes.data as any).id)
            .single(),
          6000,
          'fetch created dues'
        )
        const data = (fetchRes.data || writeRes.data) as any
        const normalized = {
          ...data,
          iuran_wajib: Number(data.iuran_wajib),
          iuran_sukarela: Number(data.iuran_sukarela),
        }
        setDues((prev) => [normalized as any, ...prev])
      toast.success('Iuran berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan iuran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<DuesFormValues>) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      // Update without relation selection
      const updateRes = await withTimeout(
        supabase.from('dues').update(values).eq('id', id).select('*').single(),
        8000,
        'update dues'
      )
      if (updateRes.error) throw updateRes.error

      // Fetch with relation
      const fetchRes = await withTimeout(
        supabase
          .from('dues')
          .select('*, member:members(id, nama_lengkap)')
          .eq('id', id)
          .single(),
        6000,
        'fetch updated dues'
      )
      const data = (fetchRes.data || updateRes.data) as any
      const normalized = {
        ...data,
        iuran_wajib: Number(data.iuran_wajib),
        iuran_sukarela: Number(data.iuran_sukarela),
      }
      setDues((prev) => prev.map((d) => (d.id === id ? (normalized as any) : d)))
      toast.success('Iuran diperbarui')
      setEditing(null)
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui iuran')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      const { error } = await withTimeout(
        supabase.from('dues').delete().eq('id', id),
        6000,
        'delete dues'
      )
      if (error) throw error
      
      const next = dues.filter((d) => d.id !== id)
      setDues(next)
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Iuran dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus iuran')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      
      const idsArray = Array.from(selectedIds)
      const { error } = await withTimeout(
        supabase.from('dues').delete().in('id', idsArray),
        10000,
        'bulk delete dues'
      )
      if (error) throw error
      
      const next = dues.filter((d) => !selectedIds.has(d.id))
      setDues(next)
      setSelectedIds(new Set())
      toast.success(`${idsArray.length} iuran berhasil dihapus`)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus iuran')
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

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    // Support back date from 2023 to future years
    const startYear = 2023
    const endYear = current + 1
    const yearList = []
    for (let year = startYear; year <= endYear; year++) {
      yearList.push(year)
    }
    return yearList.reverse() // Show newest years first
  }, [])

  const totalThisPage = useMemo(() => {
    const total = pageItems.reduce(
      (acc, d) => ({
        wajib: acc.wajib + (d.iuran_wajib || 0),
        sukarela: acc.sukarela + (d.iuran_sukarela || 0),
      }),
      { wajib: 0, sukarela: 0 }
    )
    return { ...total, total: total.wajib + total.sukarela }
  }, [pageItems])

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
              <option value="lunas">Lunas</option>
              <option value="belum_lunas">Belum Lunas</option>
            </select>
            <select value={month} onChange={(e) => { setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }} className="border border-gray-300 rounded-lg px-2 py-2">
              <option value="all">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => { setYear(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }} className="border border-gray-300 rounded-lg px-2 py-2">
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Halaman ini: <span className="font-semibold">Rp {totalThisPage.total.toLocaleString('id-ID')}</span>
          </div>
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setConfirmBulkDelete(true)} 
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Hapus {selectedIds.size} Item
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4 mr-2" /> Tambah Iuran
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <div className="flex items-center">
                    <button
                      onClick={handleSelectAll}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isAllSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isPartiallySelected
                          ? 'bg-blue-100 border-blue-600 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isAllSelected && <Check className="h-3 w-3" />}
                      {isPartiallySelected && !isAllSelected && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bulan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tahun</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Iuran Wajib</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Iuran Sukarela</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Bayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((d) => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${selectedIds.has(d.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectItem(d.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(d.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selectedIds.has(d.id) && <Check className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{d.member?.nama_lengkap || d.member_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.bulan}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.tahun}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(d.iuran_wajib || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {Number(d.iuran_sukarela || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(d.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'lunas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(d); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Hapus">
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-[680px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Iuran' : 'Tambah Iuran'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <DuesForm
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
                    <h4 className="text-base font-semibold text-gray-900">Hapus Iuran?</h4>
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

      {/* Confirm Bulk Delete */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmBulkDelete(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Hapus {selectedIds.size} Iuran?</h4>
                    <p className="text-sm text-gray-600 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 rounded border">Batal</button>
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


