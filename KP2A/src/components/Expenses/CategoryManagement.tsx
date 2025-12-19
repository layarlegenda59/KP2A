import React, { useEffect, useState } from 'react'
import {
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaTags,
  FaCreditCard,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes,
  FaPalette
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { TransactionCategory, PaymentMethod } from '../../types/transactions'
import { categorySchema, paymentMethodSchema, CategoryFormValues, PaymentMethodFormValues } from '../../schemas/transactionSchema'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Card } from '../UI/Card'
import { LoadingSpinner } from '../UI/LoadingSpinner'

type ManagementTab = 'categories' | 'payment_methods'
type ModalType = 'category' | 'payment_method' | null

interface CategoryFormData extends CategoryFormValues {
  id?: string
}

interface PaymentMethodFormData extends PaymentMethodFormValues {
  id?: string
}

const PREDEFINED_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#6B7280', '#374151'
]

export function CategoryManagement() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ManagementTab>('categories')
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editingItem, setEditingItem] = useState<CategoryFormData | PaymentMethodFormData | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Category form
  const categoryForm = useForm<CategoryFormValues>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'both',
      color_code: PREDEFINED_COLORS[0],
      description: '',
      is_active: true
    }
  })

  // Payment method form
  const paymentMethodForm = useForm<PaymentMethodFormValues>({
    resolver: yupResolver(paymentMethodSchema),
    defaultValues: {
      name: '',
      type: 'both',
      description: '',
      is_active: true
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // TODO: Implement MySQL API for categories/payment methods at /api/categories and /api/payment-methods
      // For production, show empty state - data will come from real database
      setCategories([])
      setPaymentMethods([])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const openCategoryModal = (category?: TransactionCategory) => {
    if (category) {
      setEditingItem(category)
      categoryForm.reset({
        name: category.name,
        type: category.type,
        color_code: category.color_code,
        description: category.description || '',
        is_active: category.is_active
      })
    } else {
      setEditingItem(null)
      categoryForm.reset({
        name: '',
        type: 'both',
        color_code: PREDEFINED_COLORS[0],
        description: '',
        is_active: true
      })
    }
    setModalType('category')
  }

  const openPaymentMethodModal = (paymentMethod?: PaymentMethod) => {
    if (paymentMethod) {
      setEditingItem(paymentMethod)
      paymentMethodForm.reset({
        name: paymentMethod.name,
        type: paymentMethod.type,
        description: paymentMethod.description || '',
        is_active: paymentMethod.is_active
      })
    } else {
      setEditingItem(null)
      paymentMethodForm.reset({
        name: '',
        type: 'both',
        description: '',
        is_active: true
      })
    }
    setModalType('payment_method')
  }

  const handleCategorySubmit = async (data: CategoryFormValues) => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const categoryData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      if (editingItem && 'id' in editingItem) {
        // Update existing category
        const { error } = await withTimeout(
          databaseClient
            .from('transaction_categories')
            .update(categoryData)
            .eq('id', editingItem.id),
          6000,
          'update category'
        )

        if (error) throw error

        setCategories(prev => prev.map(cat =>
          cat.id === editingItem.id
            ? { ...cat, ...categoryData }
            : cat
        ))

        toast.success('Kategori berhasil diperbarui')
      } else {
        // Create new category
        const { data: newCategory, error } = await withTimeout(
          databaseClient
            .from('transaction_categories')
            .insert([{
              ...categoryData,
              created_at: new Date().toISOString()
            }])
            .select()
            .single(),
          6000,
          'create category'
        )

        if (error) throw error

        setCategories(prev => [...prev, newCategory])
        toast.success('Kategori berhasil dibuat')
      }

      setModalType(null)
      setEditingItem(null)
      categoryForm.reset()

    } catch (error: any) {
      console.error('Failed to save category:', error)
      toast.error(error?.message || 'Gagal menyimpan kategori')
    }
  }

  const handlePaymentMethodSubmit = async (data: PaymentMethodFormValues) => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const paymentMethodData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      if (editingItem && 'id' in editingItem) {
        // Update existing payment method
        const { error } = await withTimeout(
          databaseClient
            .from('payment_methods')
            .update(paymentMethodData)
            .eq('id', editingItem.id),
          6000,
          'update payment method'
        )

        if (error) throw error

        setPaymentMethods(prev => prev.map(pm =>
          pm.id === editingItem.id
            ? { ...pm, ...paymentMethodData }
            : pm
        ))

        toast.success('Metode pembayaran berhasil diperbarui')
      } else {
        // Create new payment method
        const { data: newPaymentMethod, error } = await withTimeout(
          databaseClient
            .from('payment_methods')
            .insert([{
              ...paymentMethodData,
              created_at: new Date().toISOString()
            }])
            .select()
            .single(),
          6000,
          'create payment method'
        )

        if (error) throw error

        setPaymentMethods(prev => [...prev, newPaymentMethod])
        toast.success('Metode pembayaran berhasil dibuat')
      }

      setModalType(null)
      setEditingItem(null)
      paymentMethodForm.reset()

    } catch (error: any) {
      console.error('Failed to save payment method:', error)
      toast.error(error?.message || 'Gagal menyimpan metode pembayaran')
    }
  }

  const handleDelete = async (id: string, type: 'category' | 'payment_method') => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const tableName = type === 'category' ? 'transaction_categories' : 'payment_methods'

      const { error } = await withTimeout(
        databaseClient.from(tableName).delete().eq('id', id),
        6000,
        `delete ${type}`
      )

      if (error) throw error

      if (type === 'category') {
        setCategories(prev => prev.filter(cat => cat.id !== id))
        toast.success('Kategori berhasil dihapus')
      } else {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
        toast.success('Metode pembayaran berhasil dihapus')
      }

    } catch (error: any) {
      console.error(`Failed to delete ${type}:`, error)
      toast.error(error?.message || `Gagal menghapus ${type === 'category' ? 'kategori' : 'metode pembayaran'}`)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const toggleActiveStatus = async (id: string, currentStatus: boolean, type: 'category' | 'payment_method') => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const tableName = type === 'category' ? 'transaction_categories' : 'payment_methods'

      const { error } = await withTimeout(
        databaseClient
          .from(tableName)
          .update({
            is_active: !currentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', id),
        6000,
        `toggle ${type} status`
      )

      if (error) throw error

      if (type === 'category') {
        setCategories(prev => prev.map(cat =>
          cat.id === id ? { ...cat, is_active: !currentStatus } : cat
        ))
      } else {
        setPaymentMethods(prev => prev.map(pm =>
          pm.id === id ? { ...pm, is_active: !currentStatus } : pm
        ))
      }

      toast.success(`Status berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`)

    } catch (error: any) {
      console.error(`Failed to toggle ${type} status:`, error)
      toast.error(error?.message || 'Gagal mengubah status')
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Pemasukan'
      case 'expense': return 'Pengeluaran'
      case 'both': return 'Keduanya'
      default: return type
    }
  }

  const getTypeBadge = (type: string) => {
    const config = {
      income: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Pemasukan' },
      expense: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Pengeluaran' },
      both: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Keduanya' }
    }

    const typeConfig = config[type as keyof typeof config] || config.both

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
        {typeConfig.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manajemen Kategori &amp; Metode Pembayaran
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola kategori transaksi dan metode pembayaran
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'categories'
            ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
        >
          <FaTags className="h-4 w-4" />
          Kategori
        </button>
        <button
          onClick={() => setActiveTab('payment_methods')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'payment_methods'
            ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
        >
          <FaCreditCard className="h-4 w-4" />
          Metode Pembayaran
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Kategori Transaksi
            </h2>
            <button
              onClick={() => openCategoryModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              Tambah Kategori
            </button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color_code }}
                          />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {category.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(category.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {category.description || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActiveStatus(category.id, category.is_active, 'category')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${category.is_active
                            ? 'text-green-600 bg-green-100 dark:bg-green-900'
                            : 'text-gray-600 bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                          {category.is_active ? <FaEye className="h-3 w-3" /> : <FaEyeSlash className="h-3 w-3" />}
                          {category.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openCategoryModal(category)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaPencilAlt className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(category.id)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Hapus"
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

            {categories.length === 0 && (
              <div className="text-center py-12">
                <FaTags className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Belum ada kategori yang dibuat
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment_methods' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Metode Pembayaran
            </h2>
            <button
              onClick={() => openPaymentMethodModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              Tambah Metode Pembayaran
            </button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Metode Pembayaran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {paymentMethods.map((method) => (
                    <tr key={method.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <FaCreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {method.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(method.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {method.description || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActiveStatus(method.id, method.is_active, 'payment_method')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${method.is_active
                            ? 'text-green-600 bg-green-100 dark:bg-green-900'
                            : 'text-gray-600 bg-gray-100 dark:bg-gray-700'
                            }`}
                        >
                          {method.is_active ? <FaEye className="h-3 w-3" /> : <FaEyeSlash className="h-3 w-3" />}
                          {method.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPaymentMethodModal(method)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaPencilAlt className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(method.id)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Hapus"
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

            {paymentMethods.length === 0 && (
              <div className="text-center py-12">
                <FaCreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Belum ada metode pembayaran yang dibuat
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Category Modal */}
      <AnimatePresence>
        {modalType === 'category' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setModalType(null)
                setEditingItem(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {editingItem ? 'Edit Kategori' : 'Tambah Kategori'}
              </h3>

              <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    {...categoryForm.register('name')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan nama kategori"
                  />
                  {categoryForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipe Transaksi *
                  </label>
                  <select
                    {...categoryForm.register('type')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="both">Keduanya</option>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                  {categoryForm.formState.errors.type && (
                    <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Warna *
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      {...categoryForm.register('color_code')}
                      type="color"
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      {...categoryForm.register('color_code')}
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#000000"
                    />
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => categoryForm.setValue('color_code', color)}
                        className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  {categoryForm.formState.errors.color_code && (
                    <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.color_code.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    {...categoryForm.register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Deskripsi kategori (opsional)"
                  />
                  {categoryForm.formState.errors.description && (
                    <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    {...categoryForm.register('is_active')}
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Aktif
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null)
                      setEditingItem(null)
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={categoryForm.formState.isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {categoryForm.formState.isSubmitting ? 'Menyimpan...' : (editingItem ? 'Perbarui' : 'Simpan')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Method Modal */}
      <AnimatePresence>
        {modalType === 'payment_method' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setModalType(null)
                setEditingItem(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {editingItem ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
              </h3>

              <form onSubmit={paymentMethodForm.handleSubmit(handlePaymentMethodSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Metode Pembayaran *
                  </label>
                  <input
                    {...paymentMethodForm.register('name')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan nama metode pembayaran"
                  />
                  {paymentMethodForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">{paymentMethodForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipe Transaksi *
                  </label>
                  <select
                    {...paymentMethodForm.register('type')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="both">Keduanya</option>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                  {paymentMethodForm.formState.errors.type && (
                    <p className="text-red-500 text-xs mt-1">{paymentMethodForm.formState.errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    {...paymentMethodForm.register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Deskripsi metode pembayaran (opsional)"
                  />
                  {paymentMethodForm.formState.errors.description && (
                    <p className="text-red-500 text-xs mt-1">{paymentMethodForm.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    {...paymentMethodForm.register('is_active')}
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Aktif
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null)
                      setEditingItem(null)
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={paymentMethodForm.formState.isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {paymentMethodForm.formState.isSubmitting ? 'Menyimpan...' : (editingItem ? 'Perbarui' : 'Simpan')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmDeleteId(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Konfirmasi Hapus
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const isCategory = categories.some(cat => cat.id === confirmDeleteId)
                    handleDelete(confirmDeleteId, isCategory ? 'category' : 'payment_method')
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}