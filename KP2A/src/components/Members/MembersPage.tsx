import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { Member } from '../../types'
import { membersApi } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { MemberForm } from './MemberForm'
import { useAuth } from '../../contexts/AuthContext'
import { createWelcomeNotification } from '../../utils/notificationHelpers'

type StatusFilter = 'all' | 'aktif' | 'tidak_aktif'

export function MembersPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchMembers()
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

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const { data, error } = await membersApi.getAll()

      if (error) {
        throw new Error(error)
      }

      setMembers(data || [])
    } catch (err: any) {
      console.error('Failed to fetch members:', err)
      toast.error('Gagal memuat data anggota: ' + (err.message || 'Terjadi kesalahan'))
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filteredMembers = members.filter((m) => {
      const matchStatus = status === 'all' ? true : m.status_keanggotaan === status
      const matchSearch = q
        ? [
          m.id_anggota,
          m.nama_lengkap,
          m.nik,
          m.alamat,
          m.no_hp,
          m.jabatan,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
        : true
      return matchStatus && matchSearch
    })

    // Sort by id_anggota numerically (001, 002, 003, etc.)
    return filteredMembers.sort((a, b) => {
      const idA = a.id_anggota || ''
      const idB = b.id_anggota || ''

      // Extract numeric part from id_anggota
      const numA = parseInt(idA.replace(/\D/g, '')) || 0
      const numB = parseInt(idB.replace(/\D/g, '')) || 0

      return numA - numB
    })
  }, [members, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (payload: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('🔄 Creating member:', payload)
      const { data, error } = await membersApi.create(payload)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const newMember = data

      // Update state with properly formatted data
      setMembers((prev) => {
        // Ensure we don't add duplicate entries
        const existingIndex = prev.findIndex(m => m.id === newMember.id)
        if (existingIndex >= 0) {
          // Replace existing entry
          const updated = [...prev]
          updated[existingIndex] = newMember
          return updated
        } else {
          // Add new entry at the beginning
          return [newMember, ...prev]
        }
      })

      // Create welcome notification for new member
      if (user?.id && newMember.nama_lengkap) {
        await createWelcomeNotification(user.id, newMember.nama_lengkap)
      }

      toast.success('Anggota berhasil ditambahkan')
      setShowForm(false)

    } catch (err: any) {
      console.error('Error creating member:', err)
      toast.error(err?.message || 'Gagal menambahkan anggota')
    }
  }

  const handleUpdate = async (id: string, payload: Partial<Member>) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID anggota tidak valid')
      }

      console.log('🔄 Updating member:', { id, payload })

      const { data, error } = await membersApi.update(id, payload)

      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const updatedMember = data

      // Update state
      setMembers((prev) => {
        const memberIndex = prev.findIndex(m => m.id === id)
        if (memberIndex === -1) {
          return [updatedMember, ...prev]
        }

        const updated = [...prev]
        updated[memberIndex] = updatedMember
        return updated
      })

      toast.success('Data anggota berhasil diperbarui')
      setEditing(null)
      setShowForm(false)

    } catch (err: any) {
      console.error('❌ Error updating member:', err)
      toast.error(err?.message || 'Gagal memperbarui anggota')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await membersApi.delete(id)
      if (error) throw new Error(error)

      setMembers(prev => prev.filter(m => m.id !== id))
      toast.success('Anggota dihapus')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus anggota')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <FaSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari ID Anggota, nama, NIK, jabatan..."
              className="input focus-ring pl-9 pr-3 py-2 w-72"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter)
                setPage(1)
              }}
              className="select focus-ring px-3 py-2"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="non_aktif">Non Aktif</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn btn-primary gap-2"
        >
          <FaPlus className="h-4 w-4" />
          Tambah Anggota
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">ID Anggota</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">Nama Lengkap</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">NIK</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">Jabatan</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">No HP</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left label-small text-secondary uppercase tracking-wider">Tanggal Masuk</th>
                <th className="px-4 py-3 text-right label-small text-secondary uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.filter(m => m && typeof m === 'object').map((m) => (
                  <tr key={m?.id || Math.random()} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 body-small text-secondary">{m?.id_anggota || '-'}</td>
                    <td className="px-4 py-3 body-small text-primary">{m?.nama_lengkap || '-'}</td>
                    <td className="px-4 py-3 body-small text-secondary">{m?.nik || '-'}</td>
                    <td className="px-4 py-3 body-small text-secondary">{m?.jabatan || '-'}</td>
                    <td className="px-4 py-3 body-small text-secondary">{m?.no_hp || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full label-small ${m?.status_keanggotaan === 'aktif'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : m?.status_keanggotaan === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                        {(m?.status_keanggotaan || 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 body-small text-secondary">{m?.tanggal_masuk ? new Date(m.tanggal_masuk).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => { if (m) { setEditing(m); setShowForm(true) } }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Edit"
                          disabled={!m}
                        >
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => m?.id && setConfirmDeleteId(m.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Hapus"
                          disabled={!m?.id}
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={8}>Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {filtered.length === 0
                ? '0'
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded disabled:opacity-50"
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
                <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <MemberForm
                  initial={editing || undefined}
                  onCancel={() => { setShowForm(false); setEditing(null) }}
                  onSubmit={async (values) => {
                    if (editing) {
                      await handleUpdate(editing.id, values as Partial<Member>)
                    } else {
                      await handleCreate(values as any)
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
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Hapus Anggota?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Batal</button>
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


