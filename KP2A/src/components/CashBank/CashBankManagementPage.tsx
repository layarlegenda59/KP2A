import React, { useEffect, useState } from 'react'
import { FaExchangeAlt, FaPlus, FaSyncAlt } from 'react-icons/fa'
import { Account, CashBankTransaction, TransferFormData } from '../../types/cashbank'
import { AccountBalanceCard } from './AccountBalanceCard'
import { TransactionHistory } from './TransactionHistory'
import { TransferModal } from './TransferModal'
import { PageTransition, AnimatedContainer } from '../UI/AnimatedComponents'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export function CashBankManagementPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<CashBankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock accounts data
      const mockAccounts: Account[] = [
        {
          id: '1',
          name: 'Kas Tunai',
          type: 'cash',
          balance: 15750000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Rekening Operasional',
          type: 'bank',
          balance: 45250000,
          bank_name: 'Bank BJB',
          account_number: '1234567890',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Rekening Tabungan',
          type: 'bank',
          balance: 25000000,
          bank_name: 'Bank BJB',
          account_number: '0987654321',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      // Mock transactions data
      const mockTransactions: CashBankTransaction[] = [
        {
          id: '1',
          from_account_id: '2',
          to_account_id: '1',
          amount: 2000000,
          description: 'Pengambilan kas untuk operasional',
          transaction_date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          from_account: mockAccounts[1],
          to_account: mockAccounts[0],
        },
        {
          id: '2',
          from_account_id: '1',
          to_account_id: '3',
          amount: 5000000,
          description: 'Transfer ke tabungan',
          transaction_date: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          from_account: mockAccounts[0],
          to_account: mockAccounts[2],
        },
        {
          id: '3',
          from_account_id: '2',
          to_account_id: '1',
          amount: 1500000,
          description: 'Dana untuk pembayaran iuran',
          transaction_date: new Date(Date.now() - 259200000).toISOString(),
          status: 'completed',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          from_account: mockAccounts[1],
          to_account: mockAccounts[0],
        },
      ]

      setAccounts(mockAccounts)
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Error fetching cash bank data:', error)
      toast.error('Gagal memuat data kas & bank')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (transferData: TransferFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create new transaction
      const newTransaction: CashBankTransaction = {
        id: Date.now().toString(),
        from_account_id: transferData.from_account_id,
        to_account_id: transferData.to_account_id,
        amount: transferData.amount,
        description: transferData.description,
        transaction_date: transferData.transaction_date,
        status: 'completed',
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        from_account: accounts.find(acc => acc.id === transferData.from_account_id),
        to_account: accounts.find(acc => acc.id === transferData.to_account_id),
      }

      // Update account balances
      const updatedAccounts = accounts.map(account => {
        if (account.id === transferData.from_account_id) {
          return { ...account, balance: account.balance - transferData.amount }
        }
        if (account.id === transferData.to_account_id) {
          return { ...account, balance: account.balance + transferData.amount }
        }
        return account
      })

      setAccounts(updatedAccounts)
      setTransactions([newTransaction, ...transactions])
      setShowTransferModal(false)
      
      toast.success('Transfer berhasil dilakukan')
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast.error('Gagal melakukan transfer')
    }
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <PageTransition>
      <AnimatedContainer className="space-y-6" staggerChildren={0.1}>
        {/* Header with Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Manajemen Kas &amp; Bank</h1>
              <p className="text-blue-100 dark:text-blue-200">
                Kelola saldo dan transfer dana antar akun
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 dark:text-blue-200 text-sm">Total Saldo</p>
              <p className="text-3xl font-bold">
                Rp {totalBalance.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Account Balance Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Ringkasan Saldo
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <AccountBalanceCard account={account} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Transfer Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Aksi Cepat
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50"
            >
              <FaSyncAlt className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <FaExchangeAlt className="h-4 w-4 mr-2" />
              Transfer Dana
            </button>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TransactionHistory transactions={transactions} loading={loading} />
        </motion.div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <TransferModal
            accounts={accounts}
            onClose={() => setShowTransferModal(false)}
            onSubmit={handleTransfer}
          />
        )}
      </AnimatedContainer>
    </PageTransition>
  )
}