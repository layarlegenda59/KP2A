import React, { useEffect, useState } from 'react'
import { 
  FaPlus, 
  FaPencilAlt, 
  FaTrash, 
  FaBank,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes,
  FaCog,
  FaChartLine,
  FaRobot,
  FaExclamationTriangle
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { TransactionCategory } from '../../types/transactions'
import { isDatabaseAvailable, databaseClient, withTimeout } from '../../lib/database'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { Card } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Modal } from '../ui/Modal'
import { bankWithdrawalClassificationService, BankWithdrawalPattern } from '../../services/bankWithdrawalClassificationService'

// Types
interface BankWithdrawalCategory extends TransactionCategory {
  withdrawal_type?: string;
  auto_classification_rules?: any;
  validation_rules?: any;
}

interface PatternFormValues {
  pattern_name: string;
  description_pattern: string;
  amount_range_min: number;
  amount_range_max: number;
  frequency_pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  category_id: string;
  confidence_score: number;
  is_active: boolean;
}

interface CategoryFormValues {
  name: string;
  withdrawal_type: string;
  color_code: string;
  description: string;
  auto_classification_rules: {
    amount_range: { min: number; max: number };
    keywords: string[];
    frequency: string;
  };
  validation_rules: {
    max_daily_amount?: number;
    max_monthly_amount?: number;
    max_transaction_amount?: number;
    requires_approval: boolean;
    approval_threshold?: number;
  };
}

// Validation schemas
const categorySchema = yup.object({
  name: yup.string().required('Nama kategori wajib diisi'),
  withdrawal_type: yup.string().required('Tipe penarikan wajib dipilih'),
  color_code: yup.string().required('Warna wajib dipilih'),
  description: yup.string().required('Deskripsi wajib diisi'),
  auto_classification_rules: yup.object({
    amount_range: yup.object({
      min: yup.number().min(0, 'Minimal amount harus >= 0').required(),
      max: yup.number().min(yup.ref('min'), 'Maksimal amount harus >= minimal').required()
    }),
    keywords: yup.array().of(yup.string()).min(1, 'Minimal 1 keyword diperlukan'),
    frequency: yup.string().required()
  }),
  validation_rules: yup.object({
    max_daily_amount: yup.number().min(0).nullable(),
    max_monthly_amount: yup.number().min(0).nullable(),
    max_transaction_amount: yup.number().min(0).nullable(),
    requires_approval: yup.boolean().required(),
    approval_threshold: yup.number().min(0).nullable()
  })
})

const patternSchema = yup.object({
  pattern_name: yup.string().required('Nama pattern wajib diisi'),
  description_pattern: yup.string().required('Pattern deskripsi wajib diisi'),
  amount_range_min: yup.number().min(0, 'Minimal amount harus >= 0').required(),
  amount_range_max: yup.number().min(yup.ref('amount_range_min'), 'Maksimal amount harus >= minimal').required(),
  frequency_pattern: yup.string().required('Pattern frekuensi wajib dipilih'),
  category_id: yup.string().required('Kategori wajib dipilih'),
  confidence_score: yup.number().min(0).max(100).required('Confidence score wajib diisi'),
  is_active: yup.boolean().required()
})

const WITHDRAWAL_TYPES = [
  { value: 'operational', label: 'Operasional' },
  { value: 'payroll', label: 'Gaji Karyawan' },
  { value: 'investment', label: 'Investasi' },
  { value: 'emergency', label: 'Darurat' },
  { value: 'routine', label: 'Rutin' },
  { value: 'maintenance', label: 'Pemeliharaan' },
  { value: 'social', label: 'Sosial' }
]

const FREQUENCY_PATTERNS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'quarterly', label: 'Kuartalan' },
  { value: 'yearly', label: 'Tahunan' },
  { value: 'irregular', label: 'Tidak Teratur' }
]

const PREDEFINED_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#6B7280', '#374151'
]

export function BankWithdrawalCategoryManagement() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'categories' | 'patterns'>('categories')
  const [categories, setCategories] = useState<BankWithdrawalCategory[]>([])
  const [patterns, setPatterns] = useState<BankWithdrawalPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<'category' | 'pattern' | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)

  // Forms
  const categoryForm = useForm<CategoryFormValues>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      withdrawal_type: 'operational',
      color_code: PREDEFINED_COLORS[0],
      description: '',
      auto_classification_rules: {
        amount_range: { min: 0, max: 10000000 },
        keywords: [],
        frequency: 'monthly'
      },
      validation_rules: {
        requires_approval: false
      }
    }
  })

  const patternForm = useForm<PatternFormValues>({
    resolver: yupResolver(patternSchema),
    defaultValues: {
      pattern_name: '',
      description_pattern: '',
      amount_range_min: 0,
      amount_range_max: 10000000,
      frequency_pattern: 'monthly',
      category_id: '',
      confidence_score: 80,
      is_active: true
    }
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCategories(),
        loadPatterns(),
        loadAnalytics()
      ])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    if (!isDatabaseAvailable() || !databaseClient) return

    const { data, error } = await withTimeout(
      databaseClient
        .from('transaction_categories')
        .select('*')
        .eq('type', 'expense')
        .not('withdrawal_type', 'is', null)
        .order('name'),
      5000,
      'fetch bank withdrawal categories'
    )

    if (error) throw error
    setCategories(data || [])
  }

  const loadPatterns = async () => {
    const patterns = await bankWithdrawalClassificationService.getActivePatterns()
    setPatterns(patterns)
  }

  const loadAnalytics = async () => {
    const analytics = await bankWithdrawalClassificationService.getClassificationAnalytics()
    setAnalytics(analytics)
  }

  // Category handlers
  const openCategoryModal = (category?: BankWithdrawalCategory) => {
    if (category) {
      setEditingItem(category)
      categoryForm.reset({
        name: category.name,
        withdrawal_type: category.withdrawal_type || 'operational',
        color_code: category.color_code || PREDEFINED_COLORS[0],
        description: category.description || '',
        auto_classification_rules: category.auto_classification_rules || {
          amount_range: { min: 0, max: 10000000 },
          keywords: [],
          frequency: 'monthly'
        },
        validation_rules: category.validation_rules || {
          requires_approval: false
        }
      })
    } else {
      setEditingItem(null)
      categoryForm.reset()
    }
    setModalType('category')
  }

  const handleCategorySubmit = async (data: CategoryFormValues) => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const categoryData = {
        name: data.name,
        type: 'expense' as const,
        withdrawal_type: data.withdrawal_type,
        color_code: data.color_code,
        description: data.description,
        auto_classification_rules: data.auto_classification_rules,
        validation_rules: data.validation_rules,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      if (editingItem) {
        const { error } = await withTimeout(
          databaseClient
            .from('transaction_categories')
            .update(categoryData)
            .eq('id', editingItem.id),
          5000,
          'update category'
        )
        if (error) throw error
        toast.success('Kategori berhasil diperbarui')
      } else {
        const { error } = await withTimeout(
          databaseClient
            .from('transaction_categories')
            .insert(categoryData),
          5000,
          'create category'
        )
        if (error) throw error
        toast.success('Kategori berhasil ditambahkan')
      }

      setModalType(null)
      setEditingItem(null)
      categoryForm.reset()
      await loadCategories()
    } catch (error) {
      console.error('Category operation failed:', error)
      toast.error('Gagal menyimpan kategori')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      const { error } = await withTimeout(
        databaseClient
          .from('transaction_categories')
          .delete()
          .eq('id', id),
        5000,
        'delete category'
      )

      if (error) throw error
      toast.success('Kategori berhasil dihapus')
      setConfirmDeleteId(null)
      await loadCategories()
    } catch (error) {
      console.error('Delete category failed:', error)
      toast.error('Gagal menghapus kategori')
    }
  }

  // Pattern handlers
  const openPatternModal = (pattern?: BankWithdrawalPattern) => {
    if (pattern) {
      setEditingItem(pattern)
      patternForm.reset({
        pattern_name: pattern.pattern_name,
        description_pattern: pattern.description_pattern,
        amount_range_min: pattern.amount_range_min,
        amount_range_max: pattern.amount_range_max,
        frequency_pattern: pattern.frequency_pattern,
        category_id: pattern.category_id,
        confidence_score: pattern.confidence_score,
        is_active: pattern.is_active
      })
    } else {
      setEditingItem(null)
      patternForm.reset()
    }
    setModalType('pattern')
  }

  const handlePatternSubmit = async (data: PatternFormValues) => {
    try {
      if (editingItem) {
        const result = await bankWithdrawalClassificationService.updatePattern(editingItem.id, data)
        if (result) {
          toast.success('Pattern berhasil diperbarui')
        } else {
          throw new Error('Update failed')
        }
      } else {
        const result = await bankWithdrawalClassificationService.createPattern(data)
        if (result) {
          toast.success('Pattern berhasil ditambahkan')
        } else {
          throw new Error('Create failed')
        }
      }

      setModalType(null)
      setEditingItem(null)
      patternForm.reset()
      await loadPatterns()
    } catch (error) {
      console.error('Pattern operation failed:', error)
      toast.error('Gagal menyimpan pattern')
    }
  }

  const handleDeletePattern = async (id: string) => {
    try {
      const success = await bankWithdrawalClassificationService.deletePattern(id)
      if (success) {
        toast.success('Pattern berhasil dihapus')
        setConfirmDeleteId(null)
        await loadPatterns()
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Delete pattern failed:', error)
      toast.error('Gagal menghapus pattern')
    }
  }

  const togglePatternStatus = async (pattern: BankWithdrawalPattern) => {
    try {
      const result = await bankWithdrawalClassificationService.updatePattern(pattern.id, {
        is_active: !pattern.is_active
      })
      if (result) {
        toast.success(`Pattern ${pattern.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
        await loadPatterns()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Toggle pattern status failed:', error)
      toast.error('Gagal mengubah status pattern')
    }
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
            Manajemen Kategori Penarikan Bank
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola kategori dan pattern untuk klasifikasi otomatis penarikan bank
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FaChartLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Klasifikasi</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.total_classifications}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <FaRobot className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Akurasi</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.accuracy_score.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <FaExclamationTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Override Rate</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.override_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FaCog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.average_confidence.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <FaBank className="h-4 w-4" />
          Kategori Penarikan
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'patterns'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <FaRobot className="h-4 w-4" />
          Pattern Klasifikasi
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Kategori Penarikan Bank
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
                      Tipe Penarikan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Validasi
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
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {category.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {category.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {WITHDRAWAL_TYPES.find(t => t.value === category.withdrawal_type)?.label || category.withdrawal_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {category.validation_rules?.requires_approval ? (
                            <span className="text-yellow-600 dark:text-yellow-400">Perlu Approval</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">Otomatis</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {category.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
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
                <FaBank className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Belum ada kategori penarikan
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Mulai dengan menambahkan kategori penarikan bank pertama.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pattern Klasifikasi Otomatis
            </h2>
            <button
              onClick={() => openPatternModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              Tambah Pattern
            </button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pattern
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Range Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Frekuensi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Confidence
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
                  {patterns.map((pattern) => (
                    <tr key={pattern.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {pattern.pattern_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {pattern.description_pattern}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          Rp {pattern.amount_range_min.toLocaleString()} - Rp {pattern.amount_range_max.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {FREQUENCY_PATTERNS.find(f => f.value === pattern.frequency_pattern)?.label || pattern.frequency_pattern}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${pattern.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {pattern.confidence_score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => togglePatternStatus(pattern)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pattern.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {pattern.is_active ? (
                            <>
                              <FaEye className="h-3 w-3 mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <FaEyeSlash className="h-3 w-3 mr-1" />
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPatternModal(pattern)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaPencilAlt className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(pattern.id)}
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

            {patterns.length === 0 && (
              <div className="text-center py-12">
                <FaRobot className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Belum ada pattern klasifikasi
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tambahkan pattern untuk meningkatkan akurasi klasifikasi otomatis.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={modalType === 'category'}
        onClose={() => {
          setModalType(null)
          setEditingItem(null)
          categoryForm.reset()
        }}
        title={editingItem ? 'Edit Kategori Penarikan' : 'Tambah Kategori Penarikan'}
      >
        <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Kategori *
            </label>
            <input
              {...categoryForm.register('name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan nama kategori"
            />
            {categoryForm.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{categoryForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipe Penarikan *
            </label>
            <select
              {...categoryForm.register('withdrawal_type')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {WITHDRAWAL_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Warna *
            </label>
            <div className="flex items-center gap-2">
              <input
                {...categoryForm.register('color_code')}
                type="color"
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <div className="flex flex-wrap gap-1">
                {PREDEFINED_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => categoryForm.setValue('color_code', color)}
                    className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi *
            </label>
            <textarea
              {...categoryForm.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Deskripsi kategori"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Amount
              </label>
              <input
                {...categoryForm.register('auto_classification_rules.amount_range.min', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Amount
              </label>
              <input
                {...categoryForm.register('auto_classification_rules.amount_range.max', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              {...categoryForm.register('validation_rules.requires_approval')}
              type="checkbox"
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Memerlukan approval
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setModalType(null)
                setEditingItem(null)
                categoryForm.reset()
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingItem ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pattern Modal */}
      <Modal
        isOpen={modalType === 'pattern'}
        onClose={() => {
          setModalType(null)
          setEditingItem(null)
          patternForm.reset()
        }}
        title={editingItem ? 'Edit Pattern Klasifikasi' : 'Tambah Pattern Klasifikasi'}
      >
        <form onSubmit={patternForm.handleSubmit(handlePatternSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Pattern *
            </label>
            <input
              {...patternForm.register('pattern_name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan nama pattern"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pattern Deskripsi *
            </label>
            <input
              {...patternForm.register('description_pattern')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="keyword1|keyword2|keyword3"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gunakan | untuk memisahkan keyword
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Amount *
              </label>
              <input
                {...patternForm.register('amount_range_min', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Amount *
              </label>
              <input
                {...patternForm.register('amount_range_max', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori *
            </label>
            <select
              {...patternForm.register('category_id')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pilih kategori</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frekuensi Pattern *
            </label>
            <select
              {...patternForm.register('frequency_pattern')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FREQUENCY_PATTERNS.map(freq => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confidence Score (0-100) *
            </label>
            <input
              {...patternForm.register('confidence_score', { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              {...patternForm.register('is_active')}
              type="checkbox"
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Pattern aktif
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setModalType(null)
                setEditingItem(null)
                patternForm.reset()
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingItem ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (activeTab === 'categories') {
                  handleDeleteCategory(confirmDeleteId!)
                } else {
                  handleDeletePattern(confirmDeleteId!)
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}