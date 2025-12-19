import React, { useState } from 'react'
import { FaTimes, FaExchangeAlt, FaWallet, FaUniversity } from 'react-icons/fa'
import { Account, TransferFormData } from '../../types/cashbank'
import { formatCurrency } from '../../utils/numberFormat'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface TransferModalProps {
  accounts: Account[]
  onClose: () => void
  onSubmit: (data: TransferFormData) => Promise<void>
}

export function TransferModal({ accounts, onClose, onSubmit }: TransferModalProps) {
  const [formData, setFormData] = useState<TransferFormData>({
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.from_account_id || !formData.to_account_id) {
      toast.error('Pilih akun asal dan tujuan')
      return
    }
    
    if (formData.from_account_id === formData.to_account_id) {
      toast.error('Akun asal dan tujuan tidak boleh sama')
      return
    }
    
    if (formData.amount <= 0) {
      toast.error('Jumlah transfer harus lebih dari 0')
      return
    }
    
    const fromAccount = accounts.find(acc => acc.id === formData.from_account_id)
    if (fromAccount && formData.amount > fromAccount.balance) {
      toast.error('Saldo tidak mencukupi')
      return
    }
    
    if (!formData.description.trim()) {
      toast.error('Keterangan harus diisi')
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Transfer error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccountIcon = (type: 'cash' | 'bank') => {
    return type === 'cash' ? FaWallet : FaUniversity
  }

  const fromAccount = accounts.find(acc => acc.id === formData.from_account_id)
  const toAccount = accounts.find(acc => acc.id === formData.to_account_id)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FaExchangeAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Transfer Dana
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* From Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dari Akun
              </label>
              <select
                value={formData.from_account_id}
                onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                required
              >
                <option value="">Pilih akun asal</option>
                {accounts.map((account) => {
                  const Icon = getAccountIcon(account.type)
                  return (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  )
                })}
              </select>
              {fromAccount && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Saldo tersedia: {formatCurrency(fromAccount.balance)}
                </p>
              )}
            </div>

            {/* To Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ke Akun
              </label>
              <select
                value={formData.to_account_id}
                onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                required
              >
                <option value="">Pilih akun tujuan</option>
                {accounts
                  .filter(account => account.id !== formData.from_account_id)
                  .map((account) => {
                    const Icon = getAccountIcon(account.type)
                    return (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance)}
                      </option>
                    )
                  })}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jumlah Transfer
              </label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                placeholder="Masukkan jumlah"
                min="1"
                required
              />
              {formData.amount > 0 && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(formData.amount)}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keterangan
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                placeholder="Masukkan keterangan transfer"
                rows={3}
                required
              />
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-colors"
                required
              />
            </div>

            {/* Transfer Summary */}
            {fromAccount && toAccount && formData.amount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Ringkasan Transfer
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Dari:</span>
                    <span className="text-gray-900 dark:text-gray-100">{fromAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ke:</span>
                    <span className="text-gray-900 dark:text-gray-100">{toAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Jumlah:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(formData.amount)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Saldo setelah transfer:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatCurrency(fromAccount.balance - formData.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Transfer'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}