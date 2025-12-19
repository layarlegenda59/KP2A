import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaCheck } from 'react-icons/fa'
import { Loan, Member } from '../../types'
import { loansApi, membersApi } from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { LoansForm, LoansFormValues } from './LoansForm'
import { useAuth } from '../../contexts/AuthContext'
import { createLoanApprovalNotification } from '../../utils/notificationHelpers'

type StatusFilter = 'all' | 'aktif' | 'lunas' | 'belum_lunas' | 'pending' | 'ditolak'

export function LoansPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [loans, setLoans] = useState<(Loan & { member?: Member })[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Loan & { member?: Member } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Refetch data on mount and on navigation (location.key changes on every navigation)
  useEffect(() => {
    fetchAll()
  }, [location.key])

  // Refetch data when page becomes visible (e.g., after navigating back from loan-payments)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

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

      const { data: loansData, error: loansError } = await loansApi.getAll()
      if (loansError) throw new Error(loansError)

      setMembers(membersData || [])

      const loans = loansData || []

      // Calculate derived fields if not provided by backend
      const normalized = loans.map((d: any) => {
        const jumlahPinjaman = Number(d.jumlah_pinjaman || 0)
        const bungaPersen = Number(d.bunga_persen || 0)
        const tenorBulan = Number(d.tenor_bulan || 0)
        const sisaPinjaman = Number(d.sisa_pinjaman || 0)

        // Calculate total loan with interest (same formula as backend)
        const bungaTotal = jumlahPinjaman * (bungaPersen / 100) * (tenorBulan / 12)
        const totalPinjamanDenganBunga = jumlahPinjaman + bungaTotal

        // Total Paid = Total Loan - Remaining Balance
        const totalPaid = Math.max(0, totalPinjamanDenganBunga - sisaPinjaman)

        // Create member object from flat fields
        const member = d.nama_lengkap ? {
          id: d.member_id,
          nama_lengkap: d.nama_lengkap,
          id_anggota: d.id_anggota
        } : undefined

        return {
          ...d,
          member,
          jumlah_pinjaman: jumlahPinjaman,
          bunga_persen: bungaPersen,
          tenor_bulan: tenorBulan,
          angsuran_bulanan: Number(d.angsuran_bulanan || 0),
          sisa_pinjaman: sisaPinjaman,
          sudah_bayar_angsuran: Number(d.sudah_bayar_angsuran || 0),
          total_paid: totalPaid,
          actual_sisa_pinjaman: sisaPinjaman // Use sisa_pinjaman directly from backend
        }
      })
      setLoans(normalized)
    } catch (err) {
      console.error('Failed to fetch loans:', err)
      setMembers([])
      setLoans([])
      toast((t) => (
        <div className="flex items-start">
          <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat pinjaman</p>
            <p className="text-xs text-gray-600">Terjadi kesalahan pada server</p>
          </div>
        </div>
      ))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    // ...
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

  const totalAll = useMemo(() => {
    return filtered.reduce((sum, loan) => {
      return sum + Number(loan.jumlah_pinjaman || 0)
    }, 0)
  }, [filtered])

  const totalDibayar = useMemo(() => {
    return filtered.reduce((sum, loan) => {
      return sum + Number(loan.total_paid || 0)
    }, 0)
  }, [filtered])

  const totalSisaPinjaman = useMemo(() => {
    return filtered.reduce((sum, loan) => {
      return sum + Number(loan.actual_sisa_pinjaman || loan.sisa_pinjaman || 0)
    }, 0)
  }, [filtered])

  // Calculate loan history (which loan number for each member)
  const loanHistory = useMemo(() => {
    const history: Record<string, { count: number; loanNumbers: Record<string, number> }> = {}

    // Sort all loans by date (oldest first) to assign proper numbering
    const sortedLoans = [...loans].sort((a, b) =>
      new Date(a.tanggal_pinjaman).getTime() - new Date(b.tanggal_pinjaman).getTime()
    )

    sortedLoans.forEach((loan) => {
      const memberId = loan.member_id
      if (!history[memberId]) {
        history[memberId] = { count: 0, loanNumbers: {} }
      }
      history[memberId].count++
      history[memberId].loanNumbers[loan.id] = history[memberId].count
    })

    return history
  }, [loans])

  const handleCreate = async (values: LoansFormValues) => {
    const payload = {
      member_id: values.member_id,
      jumlah_pinjaman: values.jumlah_pinjaman,
      bunga_persen: values.bunga_persen,
      tenor_bulan: values.tenor_bulan,
      angsuran_bulanan: values.angsuran_bulanan,
      tanggal_pinjaman: values.tanggal_pinjaman,
      status: values.status,
    }
    try {
      const { data, error } = await loansApi.create(payload)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const newLoan = data

      // Add member info explicitly if API didn't populate it (though route should)
      if (!newLoan.member && members.length > 0) {
        const member = members.find(m => m.id === newLoan.member_id)
        if (member) {
          (newLoan as any).member = member
        }
      }

      const normalized = {
        ...newLoan,
        jumlah_pinjaman: Number(newLoan.jumlah_pinjaman),
        bunga_persen: Number(newLoan.bunga_persen),
        tenor_bulan: Number(newLoan.tenor_bulan),
        angsuran_bulanan: Number(newLoan.angsuran_bulanan),
        sisa_pinjaman: Number(newLoan.sisa_pinjaman),
        sudah_bayar_angsuran: Number(newLoan.sudah_bayar_angsuran || 0),
        total_paid: 0,
        actual_sisa_pinjaman: Number(newLoan.jumlah_pinjaman)
      }

      setLoans((prev) => [normalized as any, ...prev])

      // Create notification for loan approval
      if (user?.id && normalized.status === 'aktif') {
        const memberName = (normalized as any).member?.nama_lengkap || 'Anggota'
        await createLoanApprovalNotification(
          user.id,
          memberName,
          normalized.jumlah_pinjaman
        )
      }

      toast.success('Pinjaman berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pinjaman')
    } finally {
      setConfirmBulkDelete(false)
    }
  }

  const handleUpdate = async (id: string, values: Partial<LoansFormValues>) => {
    try {
      const { data, error } = await loansApi.update(id, values)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const updatedLoan = data

      setLoans((prev) => prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            ...updatedLoan as any,
            jumlah_pinjaman: Number(updatedLoan.jumlah_pinjaman),
            bunga_persen: Number(updatedLoan.bunga_persen),
            tenor_bulan: Number(updatedLoan.tenor_bulan),
            angsuran_bulanan: Number(updatedLoan.angsuran_bulanan),
            sisa_pinjaman: Number(updatedLoan.sisa_pinjaman),
            sudah_bayar_angsuran: Number(updatedLoan.sudah_bayar_angsuran || 0),
          }
        }
        return l
      }))

      toast.success('Pinjaman diperbarui')
      setEditing(null)
      setShowForm(false)

      fetchAll()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui pinjaman')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await loansApi.delete(id)
      if (error) throw new Error(error)

      const next = loans.filter((l) => l.id !== id)
      setLoans(next)
      toast.success('Pinjaman dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pinjaman')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    try {
      const idsArray = Array.from(selectedIds)

      await Promise.all(idsArray.map(id => loansApi.delete(id)))

      const next = loans.filter((l) => !selectedIds.has(l.id))
      setLoans(next)
      setSelectedIds(new Set())
      toast.success(`${idsArray.length} pinjaman berhasil dihapus`)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pinjaman')
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
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="lunas">Lunas</option>
              <option value="belum_lunas">Belum Lunas</option>
              <option value="pending">Pending</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-700 flex items-center gap-2"
            >
              <FaTrash className="h-4 w-4" /> Hapus {selectedIds.size} Item
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary gap-2">
            <FaPlus className="h-4 w-4" /> Tambah Pinjaman
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama Anggota</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pinjaman Ke-</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jasa (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tenor (bulan)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Dibayar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sisa Pinjaman</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((l) => (
                  <tr key={l.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(l.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectItem(l.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(l.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        {selectedIds.has(l.id) && <FaCheck className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{l.member?.id_anggota || '-'} {l.member?.nama_lengkap ? `- ${l.member.nama_lengkap}` : ''}</td>
                    <td className="px-4 py-3 text-center">
                      {loanHistory[l.member_id] && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${loanHistory[l.member_id].count > 1
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                          {loanHistory[l.member_id].loanNumbers[l.id]} / {loanHistory[l.member_id].count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Rp {Number(l.jumlah_pinjaman || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(l.bunga_persen || 0)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(l.tenor_bulan || 0)} bulan</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Rp {Number(l.total_paid || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Rp {Number(l.actual_sisa_pinjaman || l.sisa_pinjaman || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(l.tanggal_pinjaman).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'aktif' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        l.status === 'lunas' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          l.status === 'belum_lunas' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                            l.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>{l.status === 'belum_lunas' ? 'Belum Lunas' : l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(l); setShowForm(true) }} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Edit">
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(l.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Hapus">
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

        {/* Total */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex justify-end gap-6">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Total Pinjaman: Rp {totalAll.toLocaleString('id-ID')}
            </span>
            <span className="text-sm font-semibold text-green-800 dark:text-green-200">
              Total Dibayar: Rp {totalDibayar.toLocaleString('id-ID')}
            </span>
            <span className="text-sm font-semibold text-red-800 dark:text-red-200">
              Total Sisa Pinjaman: Rp {totalSisaPinjaman.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditing(null) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[720px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Pinjaman' : 'Tambah Pinjaman'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <FaTimes className="h-5 w-5" />
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[440px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus Pinjaman?</h4>
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
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus {selectedIds.size} Pinjaman?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">Batal</button>
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


