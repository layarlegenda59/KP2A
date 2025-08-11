import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, X, AlertTriangle, Shield, Users, Crown } from 'lucide-react'
import { User } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select(`
            *,
            member:members(*)
          `)
          .order('created_at', { ascending: false }),
        8000,
        'fetch users'
      )

      if (error) throw error
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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true
      })

      if (authError) throw authError

      // Create user profile
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: values.email,
            role: values.role,
            member_id: values.member_id || null
          })
          .select(`
            *,
            member:members(*)
          `)
          .single(),
        8000,
        'create user'
      )

      if (error) throw error
      
      setUsers(prev => [data, ...prev])
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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      const updateData: any = {
        email: values.email,
        role: values.role,
        member_id: values.member_id || null
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id)
          .select(`
            *,
            member:members(*)
          `)
          .single(),
        8000,
        'update user'
      )

      if (error) throw error
      
      setUsers(prev => prev.map(user => user.id === editingUser.id ? data : user))
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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      // Delete from users table first
      const { error: userError } = await withTimeout(
        supabase
          .from('users')
          .delete()
          .eq('id', deletingUser.id),
        8000,
        'delete user'
      )

      if (userError) throw userError

      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(deletingUser.id)
      if (authError) {
        console.warn('Error deleting auth user:', authError)
      }
      
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
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'pengurus':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
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
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Akses Ditolak</h3>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Admin</h2>
          <p className="text-gray-600">Kelola akun pengguna dan hak akses</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null)
            setShowForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengguna
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari pengguna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota Terkait
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Dibuat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRoleIcon(user.role)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.member ? user.member.nama_lengkap : '-'}
                    </div>
                    {user.member && (
                      <div className="text-sm text-gray-500">{user.member.jabatan}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setShowForm(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Hapus"
                        disabled={user.id === userProfile?.id}
                      >
                        <Trash2 className="h-4 w-4" />
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
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada pengguna</h3>
            <p className="text-gray-600">Belum ada pengguna yang sesuai dengan filter.</p>
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
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
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
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Konfirmasi Hapus</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Apakah Anda yakin ingin menghapus pengguna <strong>{deletingUser.email}</strong>? 
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeletingUser(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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