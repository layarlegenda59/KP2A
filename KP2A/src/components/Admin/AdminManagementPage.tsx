import React, { useEffect, useMemo, useState } from 'react'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaLock, FaUsers, FaCrown } from 'react-icons/fa'
import { User } from '../../types'
import { usersApi } from '../../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { AdminForm, AdminFormValues } from './AdminForm'
import { useAuth } from '../../contexts/AuthContext'

type RoleFilter = 'all' | 'admin' | 'pengurus' | 'anggota'

export function AdminManagementPage() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  // Check if current user is admin
  const isAdmin = userProfile?.role === 'admin'

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await usersApi.getAll()

      if (error) throw new Error(error)
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.member?.nama_lengkap || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  const handleCreate = async (values: AdminFormValues) => {
    try {
      const { data, error } = await usersApi.create({
        email: values.email,
        role: values.role,
        member_id: values.member_id || undefined
      })

      if (error) throw new Error(error)

      if (data) {
        setUsers(prev => [data, ...prev])
      }
      setShowForm(false)
      toast.success('Pengguna berhasil dibuat')
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Gagal membuat pengguna')
    }
  }

  const handleUpdate = async (values: AdminFormValues) => {
    if (!editingUser) return

    try {
      const { data, error } = await usersApi.update(editingUser.id, {
        email: values.email,
        role: values.role,
        member_id: values.member_id || undefined
      })

      if (error) throw new Error(error)

      if (data) {
        setUsers(prev => prev.map(user => user.id === editingUser.id ? data : user))
      }
      setEditingUser(null)
      setShowForm(false)
      toast.success('Pengguna berhasil diperbarui')
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Gagal memperbarui pengguna')
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return

    try {
      const { error } = await usersApi.delete(deletingUser.id)

      if (error) throw new Error(error)

      setUsers(prev => prev.filter(user => user.id !== deletingUser.id))
      setDeletingUser(null)
      toast.success('Pengguna berhasil dihapus')
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Gagal menghapus pengguna')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <FaCrown className="h-4 w-4 text-yellow-600" />
      case 'pengurus':
        return <FaLock className="h-4 w-4 text-blue-600" />
      default:
        return <FaUsers className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800'
      case 'pengurus':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-danger mx-auto mb-4" />
          <h3 className="heading-3 text-primary mb-2">Akses Ditolak</h3>
          <p className="body-medium text-secondary">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="heading-2 text-primary">Manajemen Admin</h2>
          <p className="body-medium text-secondary">Kelola akun pengguna dan hak akses</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null)
            setShowForm(true)
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <FaPlus className="h-4 w-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari pengguna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input focus-ring w-full pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <FaFilter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="select focus-ring dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="pengurus">Pengurus</option>
              <option value="anggota">Anggota</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header text-left text-gray-500 dark:text-gray-400">
                  Pengguna
                </th>
                <th className="table-header text-left text-gray-500 dark:text-gray-400">
                  Role
                </th>
                <th className="table-header text-left text-gray-500 dark:text-gray-400">
                  Anggota Terkait
                </th>
                <th className="table-header text-left text-gray-500 dark:text-gray-400">
                  Tanggal Dibuat
                </th>
                <th className="table-header text-right text-gray-500 dark:text-gray-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="body-medium text-primary dark:text-white">{user.email}</div>
                      <div className="body-small text-secondary dark:text-gray-400">ID: {user.id.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRoleIcon(user.role)}
                      <span className={`ml-2 badge ${getRoleBadge(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="body-medium text-primary dark:text-white">
                      {user.member ? user.member.nama_lengkap : '-'}
                    </div>
                    {user.member && (
                      <div className="body-small text-secondary dark:text-gray-400">{user.member.jabatan}</div>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className="body-small text-secondary dark:text-gray-400">{new Date(user.created_at).toLocaleDateString('id-ID')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setShowForm(true)
                        }}
                        className="text-primary hover:text-primary-dark dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        <FaPencilAlt className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        className="text-danger hover:text-danger-dark dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors"
                        title="Hapus"
                        disabled={user.id === userProfile?.id}
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <FaUsers className="h-12 w-12 text-secondary dark:text-gray-600 mx-auto mb-4" />
            <h3 className="heading-3 text-primary dark:text-white mb-2">Tidak ada pengguna</h3>
            <p className="body-medium text-secondary dark:text-gray-400">Belum ada pengguna yang sesuai dengan filter.</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="heading-3 text-primary dark:text-white">
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingUser(null)
                  }}
                  className="text-secondary hover:text-primary dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <AdminForm
                  initialData={editingUser}
                  onSubmit={editingUser ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setShowForm(false)
                    setEditingUser(null)
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <FaExclamationTriangle className="h-6 w-6 text-danger mr-3" />
                  <h3 className="heading-3 text-primary dark:text-white">Konfirmasi Hapus</h3>
                </div>
                <p className="body-medium text-secondary dark:text-gray-300 mb-6">
                  Apakah Anda yakin ingin menghapus pengguna <strong className="text-gray-900 dark:text-white">{deletingUser.email}</strong>?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeletingUser(null)}
                    className="btn btn-secondary dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}