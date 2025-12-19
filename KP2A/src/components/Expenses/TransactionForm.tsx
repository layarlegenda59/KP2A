import React, { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { FaArrowUp, FaArrowDown, FaTimes, FaRobot, FaCheck, FaExclamationTriangle, FaEye, FaCog } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { Transaction, TransactionCategory, PaymentMethod } from '../../types/transactions'
import { transactionSchema, TransactionFormValues } from '../../schemas/transactionSchema'
import { handleNumberInputChange, formatInitialValue } from '../../utils/numberFormat'
import { isDatabaseAvailable, databaseClient, withTimeout } from '../../lib/database'
import toast from 'react-hot-toast'
import { Card } from '../UI/Card'
import { LoadingSpinner } from '../UI/LoadingSpinner'
import { bankWithdrawalClassificationService, ClassificationResult } from '../../services/bankWithdrawalClassificationService'
import { bankWithdrawalValidationService, ValidationResult } from '../../services/bankWithdrawalValidationService'

interface TransactionFormProps {
  initial?: Transaction
  onSubmit: (values: TransactionFormValues) => Promise<void> | void
  onCancel: () => void
  isOpen: boolean
}

interface ClassificationPreview {
  result: ClassificationResult | null
  isLoading: boolean
  error: string | null
  manualOverride: boolean
}

interface ValidationPreview {
  result: ValidationResult | null
  isLoading: boolean
  error: string | null
}

export function TransactionForm({ initial, onSubmit, onCancel, isOpen }: TransactionFormProps) {
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(initial?.transaction_type || 'expense')
  const [classification, setClassification] = useState<ClassificationPreview>({
    result: null,
    isLoading: false,
    error: null,
    manualOverride: false
  })
  
  const [validation, setValidation] = useState<ValidationPreview>({
    result: null,
    isLoading: false,
    error: null
  })

  const defaultValues: Partial<TransactionFormValues> = initial
    ? {
        transaction_type: initial.transaction_type,
        amount: Number(initial.amount),
        transaction_date: initial.transaction_date.slice(0, 10),
        category_id: initial.category_id,
        description: initial.description || '',
        payment_method_id: initial.payment_method_id,
        status: initial.status,
      }
    : {
        transaction_type: 'expense',
        amount: 0,
        transaction_date: new Date().toISOString().slice(0, 10),
        category_id: '',
        description: '',
        payment_method_id: '',
        status: 'pending',
      }

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch,
    reset,
    formState: { errors, isSubmitting } 
  } = useForm<TransactionFormValues>({
    resolver: yupResolver(transactionSchema),
    defaultValues: defaultValues as any,
  })

  const watchedType = watch('transaction_type')
  const watchedAmount = watch('amount')
  const watchedDescription = watch('description')
  const watchedPaymentMethod = watch('payment_method_id')

  useEffect(() => {
    if (isOpen) {
      fetchFormData()
      if (initial) {
        reset(defaultValues as any)
        setSelectedType(initial.transaction_type)
      } else {
        reset({
          transaction_type: 'expense',
          amount: 0,
          transaction_date: new Date().toISOString().slice(0, 10),
          category_id: '',
          description: '',
          payment_method_id: '',
          status: 'pending',
        })
        setSelectedType('expense')
      }
      // Reset classification and validation state
      setClassification({
        result: null,
        isLoading: false,
        error: null,
        manualOverride: false
      })
      setValidation({
        result: null,
        isLoading: false,
        error: null
      })
    }
  }, [isOpen, initial, reset])

  useEffect(() => {
    setSelectedType(watchedType)
  }, [watchedType])

  // Auto-classification effect
  useEffect(() => {
    if (isOpen && selectedType === 'expense' && watchedAmount && watchedDescription && watchedPaymentMethod) {
      const paymentMethod = paymentMethods.find(pm => pm.id === watchedPaymentMethod)
      if (paymentMethod && paymentMethod.type === 'bank_transfer') {
        performAutoClassification()
      }
    }
  }, [watchedAmount, watchedDescription, watchedPaymentMethod, selectedType, isOpen, paymentMethods])

  // Auto-validation effect
  useEffect(() => {
    if (isOpen && watchedAmount && watchedDescription && watchedPaymentMethod) {
      performAutoValidation()
    }
  }, [watchedAmount, watchedDescription, watchedPaymentMethod, watch('category_id'), watch('transaction_date'), selectedType, isOpen])

  const performAutoClassification = useCallback(async () => {
    if (classification.manualOverride) return

    setClassification(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const transactionData = {
        amount: Number(watchedAmount) || 0,
        description: watchedDescription || '',
        payment_method_id: watchedPaymentMethod || '',
        transaction_date: new Date().toISOString()
      }

      const result = await bankWithdrawalClassificationService.classifyTransaction(transactionData)
      
      setClassification(prev => ({
        ...prev,
        result,
        isLoading: false,
        error: null
      }))

      // Auto-select the suggested category if confidence is high enough
      if (result && result.confidence_score >= 80 && !classification.manualOverride) {
        setValue('category_id', result.suggested_category_id)
      }

    } catch (error) {
      console.error('Auto-classification failed:', error)
      setClassification(prev => ({
        ...prev,
        result: null,
        isLoading: false,
        error: 'Gagal melakukan klasifikasi otomatis'
      }))
    }
  }, [watchedAmount, watchedDescription, watchedPaymentMethod, classification.manualOverride, setValue])

  const performAutoValidation = useCallback(async () => {
    setValidation(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const transactionData = {
        amount: Number(watchedAmount) || 0,
        description: watchedDescription || '',
        payment_method_id: watchedPaymentMethod || '',
        category_id: watch('category_id') || '',
        transaction_date: watch('transaction_date') || new Date().toISOString().slice(0, 10)
      }

      const result = await bankWithdrawalValidationService.validateTransaction(transactionData)
      
      setValidation(prev => ({
        ...prev,
        result,
        isLoading: false,
        error: null
      }))

    } catch (error) {
      console.error('Auto-validation failed:', error)
      setValidation(prev => ({
        ...prev,
        result: null,
        isLoading: false,
        error: 'Gagal melakukan validasi transaksi'
      }))
    }
  }, [watchedAmount, watchedDescription, watchedPaymentMethod, watch])

  const fetchFormData = async () => {
    setLoadingData(true)
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await withTimeout(
        databaseClient
          .from('transaction_categories')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        5000,
        'fetch categories'
      )

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Fetch payment methods
      const { data: paymentMethodsData, error: paymentMethodsError } = await withTimeout(
        databaseClient
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        5000,
        'fetch payment methods'
      )

      if (paymentMethodsError) throw paymentMethodsError
      setPaymentMethods(paymentMethodsData || [])

    } catch (error) {
      console.error('Failed to fetch form data:', error)
      toast.error('Gagal memuat data form')
    } finally {
      setLoadingData(false)
    }
  }

  const filteredCategories = categories.filter(cat => cat.type === selectedType)

  const handleFormSubmit = async (values: TransactionFormValues) => {
    try {
      // Check validation results before submission
      if (validation.result && !validation.result.isValid) {
        toast.error('Transaksi tidak dapat disimpan karena ada kesalahan validasi')
        return
      }

      if (validation.result && validation.result.requiresApproval) {
        toast.warning(`Transaksi memerlukan persetujuan: ${validation.result.approvalReason}`)
      }

      // Log classification if it was used
      if (classification.result && !classification.manualOverride) {
        await bankWithdrawalClassificationService.logClassification({
          transaction_id: '', // Will be set after transaction creation
          suggested_category_id: classification.result.suggested_category_id,
          actual_category_id: values.category_id,
          confidence_score: classification.result.confidence_score,
          pattern_matched: classification.result.pattern_matched,
          is_manual_override: false
        })
      } else if (classification.result && classification.manualOverride) {
        await bankWithdrawalClassificationService.logManualOverride({
          transaction_id: '', // Will be set after transaction creation
          original_category_id: classification.result.suggested_category_id,
          new_category_id: values.category_id,
          reason: 'Manual override by user'
        })
      }

      await onSubmit(values)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleTypeChange = (type: 'income' | 'expense') => {
    setSelectedType(type)
    setValue('transaction_type', type)
    setValue('category_id', '') // Reset category when type changes
    
    // Reset classification and validation when changing type
    setClassification({
      result: null,
      isLoading: false,
      error: null,
      manualOverride: false
    })
    setValidation({
      result: null,
      isLoading: false,
      error: null
    })
  }

  const handleManualCategoryChange = (categoryId: string) => {
    setValue('category_id', categoryId)
    
    // Mark as manual override if different from suggestion
    if (classification.result && categoryId !== classification.result.suggested_category_id) {
      setClassification(prev => ({ ...prev, manualOverride: true }))
    } else if (classification.result && categoryId === classification.result.suggested_category_id) {
      setClassification(prev => ({ ...prev, manualOverride: false }))
    }
  }

  const acceptClassificationSuggestion = () => {
    if (classification.result) {
      setValue('category_id', classification.result.suggested_category_id)
      setClassification(prev => ({ ...prev, manualOverride: false }))
    }
  }

  const rejectClassificationSuggestion = () => {
    setClassification(prev => ({ ...prev, manualOverride: true }))
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900'
    return 'bg-red-100 dark:bg-red-900'
  }

  const isBankTransfer = () => {
    const selectedPaymentMethod = paymentMethods.find(pm => pm.id === watchedPaymentMethod)
    return selectedPaymentMethod?.type === 'bank_transfer'
  }

  const shouldShowClassification = () => {
    return selectedType === 'expense' && isBankTransfer() && (classification.result || classification.isLoading || classification.error)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {initial ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Transaction Type Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipe Transaksi
                </label>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                      selectedType === 'expense'
                        ? 'bg-red-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FaArrowDown className="h-4 w-4" />
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                      selectedType === 'income'
                        ? 'bg-green-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FaArrowUp className="h-4 w-4" />
                    Pemasukan
                  </button>
                </div>
                <input type="hidden" {...register('transaction_type')} />
                {errors.transaction_type && (
                  <p className="text-sm text-red-600">{errors.transaction_type.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Jumlah *
                  </label>
                  <input
                    type="text"
                    defaultValue={formatInitialValue(defaultValues.amount)}
                    onChange={(e) => handleNumberInputChange(e, setValue, 'amount')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Rp 0"
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                {/* Transaction Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    {...register('transaction_date')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {errors.transaction_date && (
                    <p className="text-sm text-red-600">{errors.transaction_date.message}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Metode Pembayaran *
                  </label>
                  <select
                    {...register('payment_method_id')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Pilih Metode Pembayaran</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name} ({method.type})
                      </option>
                    ))}
                  </select>
                  {errors.payment_method_id && (
                    <p className="text-sm text-red-600">{errors.payment_method_id.message}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategori *
                  </label>
                  <select
                    {...register('category_id')}
                    onChange={(e) => handleManualCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Pilih Kategori</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="text-sm text-red-600">{errors.category_id.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deskripsi *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Masukkan deskripsi transaksi"
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Auto-Classification Preview */}
              {shouldShowClassification() && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FaRobot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Klasifikasi Otomatis
                    </h3>
                  </div>

                  {classification.isLoading && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Menganalisis transaksi...
                      </span>
                    </div>
                  )}

                  {classification.error && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <FaExclamationTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        {classification.error}
                      </span>
                    </div>
                  )}

                  {classification.result && (
                    <div className={`p-4 rounded-lg border ${
                      classification.manualOverride 
                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : getConfidenceBgColor(classification.result.confidence_score) + ' border-current'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Kategori yang Disarankan:
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {categories.find(c => c.id === classification.result?.suggested_category_id)?.name || 'Unknown'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Confidence:
                            </span>
                            <span className={`text-sm font-medium ${getConfidenceColor(classification.result.confidence_score)}`}>
                              {classification.result.confidence_score}%
                            </span>
                          </div>

                          {classification.result.pattern_matched && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Pattern:
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {classification.result.pattern_matched}
                              </span>
                            </div>
                          )}

                          {classification.result.reasoning && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {classification.result.reasoning}
                            </div>
                          )}

                          {classification.manualOverride && (
                            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                              <FaEye className="h-3 w-3" />
                              Manual override aktif
                            </div>
                          )}
                        </div>

                        {!classification.manualOverride && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={acceptClassificationSuggestion}
                              className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors"
                              title="Terima saran"
                            >
                              <FaCheck className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={rejectClassificationSuggestion}
                              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                              title="Tolak saran"
                            >
                              <FaTimes className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Results */}
              {(validation.result || validation.isLoading || validation.error) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Validasi Transaksi
                    </h3>
                  </div>

                  {validation.isLoading && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Memvalidasi transaksi...
                      </span>
                    </div>
                  )}

                  {validation.error && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <FaExclamationTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        {validation.error}
                      </span>
                    </div>
                  )}

                  {validation.result && (
                    <div className="space-y-2">
                      {/* Validation Errors */}
                      {validation.result.errors.length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <FaTimes className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-800 dark:text-red-200">
                              Kesalahan Validasi ({validation.result.errors.length})
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {validation.result.errors.map((error, index) => (
                              <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{error.message}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Validation Warnings */}
                      {validation.result.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center gap-2 mb-2">
                            <FaExclamationTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Peringatan ({validation.result.warnings.length})
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {validation.result.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>{warning.message}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Approval Required */}
                      {validation.result.requiresApproval && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <FaCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Memerlukan Persetujuan
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {validation.result.approvalReason}
                          </p>
                        </div>
                      )}

                      {/* Validation Success */}
                      {validation.result.isValid && validation.result.errors.length === 0 && validation.result.warnings.length === 0 && !validation.result.requiresApproval && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <FaCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Validasi berhasil
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                {errors.status && (
                  <p className="text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (validation.result && !validation.result.isValid)}
                  className={`px-6 py-2 text-white rounded-lg transition-colors ${
                    selectedType === 'income'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}