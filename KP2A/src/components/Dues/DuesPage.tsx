import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaCheck } from 'react-icons/fa'
import { Due, Member } from '../../types'
import { duesApi, membersApi } from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { DuesForm, DuesFormValues } from './DuesForm'
import { useAuth } from '../../contexts/AuthContext'
import { createDuesPaymentNotification } from '../../utils/notificationHelpers'
import { formatCurrency } from '../../utils/numberFormat'
import { reseedDuesData } from '../../utils/reseed-dues'

type StatusFilter = 'all' | 'lunas' | 'belum_lunas'

export function DuesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dues, setDues] = useState<(Due & { member?: Member })[]>([])
  const [allDues, setAllDues] = useState<(Due & { member?: Member })[]>([]) // For total calculation
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

  // Reload data when filters change
  useEffect(() => {
    fetchAll()
  }, [status, month, year])

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
      const { data: membersData, error: membersError } = await membersApi.getAll()
      if (membersError) throw new Error(membersError)

      const { data: duesData, error: duesError } = await duesApi.getAll()
      if (duesError) throw new Error(duesError)

      setMembers(membersData || [])

      // Set all dues data - filtering will be done in frontend
      const allNormalized = (duesData || []).map((d) => ({
        ...d,
        iuran_wajib: Number(d.iuran_wajib),
        iuran_sukarela: Number(d.iuran_sukarela),
        simpanan_wajib: Number(d.simpanan_wajib || 0),
        member: d.member || (d.nama_lengkap ? {
          nama_lengkap: d.nama_lengkap,
          id_anggota: d.id_anggota,
          id: d.member_id
        } : undefined)
      }))
      setDues(allNormalized as any[])
      setAllDues(allNormalized as any[])
    } catch (err) {
      console.error('Failed to fetch dues:', err)
      setMembers([])
      setDues([])
      setAllDues([])
      toast((t) => (
        <div className="flex items-start">
          <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat iuran</p>
            <p className="text-xs text-gray-600">Terjadi kesalahan pada server</p>
          </div>
        </div>
      ))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    // ... (logging commented out for brevity)

    if (!dues) return [];

    const q = search.trim().toLowerCase();
    return dues.filter((d) => {
      const matchStatus = status === 'all' ? true : d.status === status;
      const matchMonth = month === 'all' ? true : d.bulan === month;
      const matchYear = year === 'all' ? true : d.tahun === year;
      const matchSearch = q ? (d.member?.nama_lengkap || '').toLowerCase().includes(q) : true;

      return matchStatus && matchMonth && matchYear && matchSearch;
    });
  }, [dues, search, status, month, year]);

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
      // simpanan_wajib: values.simpanan_wajib, // Not in MySQL schema
      tanggal_bayar: values.tanggal_bayar,
      status: values.status,
    }

    console.log('Creating dues with payload:', payload)

    try {
      const { data, error } = await duesApi.create(payload)

      if (error) {
        if (error.includes('sudah ada')) throw new Error('Iuran untuk bulan/tahun ini sudah ada')
        throw new Error(error)
      }
      if (!data) throw new Error('No data returned')

      const newDue = data

      // Add member info explicitly if API didn't populate it (though route should)
      if (!newDue.member) {
        if (newDue.nama_lengkap) {
          (newDue as any).member = {
            nama_lengkap: newDue.nama_lengkap,
            id_anggota: newDue.id_anggota,
            id: newDue.member_id
          }
        } else if (members.length > 0) {
          const member = members.find(m => m.id === newDue.member_id)
          if (member) {
            (newDue as any).member = member
          }
        }
      }

      setDues((prev) => [newDue as any, ...prev])
      setAllDues((prev) => [newDue as any, ...prev])

      // Create notification for dues payment
      if (user?.id && newDue.status === 'lunas') {
        const memberName = (newDue as any).member?.nama_lengkap || 'Anggota'
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        const monthName = monthNames[newDue.bulan - 1]
        await createDuesPaymentNotification(
          user.id,
          memberName,
          `${monthName} ${newDue.tahun}`,
          newDue.iuran_wajib + newDue.iuran_sukarela
        )
      }

      toast.success('Iuran berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      console.error('Error creating dues:', err)
      toast.error(err?.message || 'Gagal menyimpan iuran')
    }
  }

  const handleUpdate = async (id: string, values: Partial<DuesFormValues>) => {
    try {
      const payload: Partial<Due> = {
        member_id: values.member_id,
        bulan: values.bulan,
        tahun: values.tahun,
        iuran_wajib: values.iuran_wajib,
        iuran_sukarela: values.iuran_sukarela,
        tanggal_bayar: values.tanggal_bayar,
        status: values.status,
      }

      const { data, error } = await duesApi.update(id, payload)
      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const updatedDue = data

      // Ensure member object is populated
      if (!(updatedDue as any).member) {
        if (updatedDue.nama_lengkap) {
          (updatedDue as any).member = {
            nama_lengkap: updatedDue.nama_lengkap,
            id_anggota: updatedDue.id_anggota,
            id: updatedDue.member_id
          }
        } else {
          const member = members.find(m => m.id === updatedDue.member_id)
          if (member) {
            (updatedDue as any).member = member
          }
        }
      }

      setDues((prev) => prev.map((d) => (d.id === id ? (updatedDue as any) : d)))
      setAllDues((prev) => prev.map((d) => (d.id === id ? (updatedDue as any) : d)))

      toast.success('Iuran diperbarui')
      setEditing(null)
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui iuran')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await duesApi.delete(id)
      if (error) throw new Error(error)

      const next = dues.filter((d) => d.id !== id)
      setDues(next)
      setAllDues(prev => prev.filter(d => d.id !== id))

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
      // API doesn't support bulk delete yet, do sequential
      const idsArray = Array.from(selectedIds)

      // Execute in parallel
      await Promise.all(idsArray.map(id => duesApi.delete(id)))

      const next = dues.filter((d) => !selectedIds.has(d.id))
      setDues(next)
      setAllDues(prev => prev.filter(d => !selectedIds.has(d.id)))
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

  const totalAll = useMemo(() => {
    if (!dues) return { iuran_wajib: 0, iuran_sukarela: 0, simpanan_wajib: 0 };

    const q = search.trim().toLowerCase();

    const totalsList = dues.filter((d) => {
      const matchMonth = month === 'all' ? true : d.bulan === month;
      const matchYear = year === 'all' ? true : d.tahun === year;
      const matchSearch = q ? (d.member?.nama_lengkap || '').toLowerCase().includes(q) : true;
      const matchStatus = status === 'all' ? true : d.status === status;
      return matchMonth && matchYear && matchSearch && matchStatus;
    });

    return totalsList.reduce(
      (acc, due) => {
        const iuranWajib = parseFloat(due.iuran_wajib?.toString() || '0');
        const iuranSukarela = parseFloat(due.iuran_sukarela?.toString() || '0');
        const simpananWajib = parseFloat(due.simpanan_wajib?.toString() || '0');

        acc.iuran_wajib += iuranWajib;
        acc.iuran_sukarela += iuranSukarela;
        acc.simpanan_wajib += simpananWajib;

        return acc;
      },
      { iuran_wajib: 0, iuran_sukarela: 0, simpanan_wajib: 0 }
    );
  }, [dues, search, month, year, status]);

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
              placeholder="Cari nama anggota..."
              className="pl-9 pr-3 py-2 w-72 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div >
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="belum_lunas">Belum Lunas</option>
            </select>
            <select value={month} onChange={(e) => { setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => { setYear(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1) }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div >

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Jumlah Iuran Wajib: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalAll.iuran_wajib)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Jumlah Simpanan Sukarela: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalAll.iuran_sukarela)}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Jumlah Simpanan Wajib: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalAll.simpanan_wajib)}</span>
            </div>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-700 flex items-center gap-2"
            >
              <FaTrash className="h-4 w-4" /> Hapus {selectedIds.size} Item
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 flex items-center gap-2">
            <FaPlus className="h-4 w-4" /> Tambah Iuran
          </button>
        </div>
      </div >

      {/* Table */}
      < div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden" >
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bulan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahun</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Iuran Wajib</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SIMPANAN SUKARELA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Simpanan Wajib</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal Bayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((d) => (
                  <tr key={d.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(d.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectItem(d.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(d.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        {selectedIds.has(d.id) && <FaCheck className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{d.member?.nama_lengkap || d.member_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{d.bulan}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{d.tahun}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(Number(d.iuran_wajib || 0))}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(Number(d.iuran_sukarela || 0))}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(Number(d.simpanan_wajib || 0))}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(d.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'lunas' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(d); setShowForm(true) }} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Edit">
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(d.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Hapus">
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>Tidak ada data</td>
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
              <span className="text-sm dark:text-gray-300">Page</span>
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
              <span className="text-sm dark:text-gray-300">of {totalPages}</span>
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div >

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {
          showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditing(null) }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Iuran' : 'Tambah Iuran'}</h3>
                  <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
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
          )
        }
      </AnimatePresence >

      {/* Confirm Delete */}
      <AnimatePresence>
        {
          confirmDeleteId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-5">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus Iuran?</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-6">
                    <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">Batal</button>
                    <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Hapus</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Confirm Bulk Delete */}
      <AnimatePresence>
        {
          confirmBulkDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmBulkDelete(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-5">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus {selectedIds.size} Iuran?</h4>
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
          )
        }
      </AnimatePresence >
    </div >
  )
}


