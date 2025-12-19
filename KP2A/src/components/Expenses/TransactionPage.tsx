import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FaChartLine, FaPlus, FaList, FaChartBar, FaCog, FaFlask } from 'react-icons/fa'
import { TransactionDashboard } from './TransactionDashboard'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { Reports } from './Reports'
import { CategoryManagement } from './CategoryManagement'
import { isDatabaseAvailable, databaseClient } from '../../lib/database'
import { Transaction } from '../../types/transactions'
import { bankWithdrawalClassificationService } from '../../services/bankWithdrawalClassificationService'
import { bankWithdrawalValidationService } from '../../services/bankWithdrawalValidationService'
import toast from 'react-hot-toast'

type TabType = 'dashboard' | 'list' | 'reports' | 'categories' | 'test'

export function TransactionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [testResults, setTestResults] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: FaChartLine },
    { id: 'list' as TabType, name: 'Daftar Transaksi', icon: FaList },
    { id: 'reports' as TabType, name: 'Laporan', icon: FaChartBar },
    { id: 'categories' as TabType, name: 'Kategori & Metode', icon: FaCog },
    { id: 'test' as TabType, name: 'Test System', icon: FaFlask },
  ]

  const handleTransactionSubmit = async (values: any) => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      if (editingTransaction) {
        // Update existing transaction
        const { error } = await databaseClient
          .from('transactions')
          .update({
            transaction_type: values.transaction_type,
            amount: values.amount,
            transaction_date: values.transaction_date,
            category_id: values.category_id,
            description: values.description,
            payment_method_id: values.payment_method_id,
            status: values.status,
          })
          .eq('id', editingTransaction.id)

        if (error) throw error
        toast.success('Transaksi berhasil diperbarui')
      } else {
        // Create new transaction
        const session = await databaseClient.auth.getSession()
        const userId = session.data.session?.user?.id
        
        if (!userId) {
          throw new Error('User tidak terautentikasi')
        }

        const { error } = await databaseClient
          .from('transactions')
          .insert({
            transaction_type: values.transaction_type,
            amount: values.amount,
            transaction_date: values.transaction_date,
            category_id: values.category_id,
            description: values.description,
            payment_method_id: values.payment_method_id,
            status: values.status,
            created_by: userId,
          })

        if (error) throw error
        toast.success('Transaksi berhasil disimpan')
      }

      setIsFormOpen(false)
      setEditingTransaction(undefined)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to save transaction:', error)
      toast.error('Gagal menyimpan transaksi')
      throw error
    }
  }

  const handleAddTransaction = () => {
    setEditingTransaction(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    // Trigger refresh after delete
    setRefreshTrigger(prev => prev + 1)
  }

  const testBankWithdrawalSystem = async () => {
    setTestLoading(true)
    setTestResults(null)
    
    try {
      const testTransaction = {
        amount: 5000000,
        description: 'Penarikan untuk operasional kantor bulan ini',
        payment_method_id: 'bank-transfer-001',
        category_id: '',
        transaction_date: new Date().toISOString().slice(0, 10)
      }

      // Test Classification
      console.log('🧪 Testing Classification Service...')
      const classificationResult = await bankWithdrawalClassificationService.classifyTransaction(testTransaction)
      
      // Test Validation
      console.log('🧪 Testing Validation Service...')
      const validationResult = await bankWithdrawalValidationService.validateTransaction(testTransaction)
      
      // Test Analytics
      console.log('🧪 Testing Analytics Service...')
      const analyticsResult = await bankWithdrawalClassificationService.getClassificationAnalytics('last_30_days')
      
      setTestResults({
        classification: classificationResult,
        validation: validationResult,
        analytics: analyticsResult,
        testTransaction
      })
      
      toast.success('✅ Bank withdrawal system test completed successfully!')
    } catch (error) {
      console.error('Test failed:', error)
      toast.error(`❌ Test failed: ${error.message}`)
      setTestResults({ error: error.message })
    } finally {
      setTestLoading(false)
    }
  }

  const renderTestContent = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🧪 Bank Withdrawal System Test
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test the bank withdrawal classification and validation system with sample data.
          </p>
          
          <button
            onClick={testBankWithdrawalSystem}
            disabled={testLoading}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <FaFlask className="h-4 w-4 mr-2" />
            {testLoading ? 'Running Tests...' : 'Run System Test'}
          </button>
        </div>

        {testResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Test Results
            </h3>
            
            {testResults.error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">
                  ❌ Error: {testResults.error}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Test Transaction */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    📝 Test Transaction
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p><strong>Amount:</strong> Rp {testResults.testTransaction.amount.toLocaleString('id-ID')}</p>
                    <p><strong>Description:</strong> {testResults.testTransaction.description}</p>
                    <p><strong>Date:</strong> {testResults.testTransaction.transaction_date}</p>
                  </div>
                </div>

                {/* Classification Results */}
                {testResults.classification && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      🎯 Classification Results
                    </h4>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p><strong>Suggested Category:</strong> {testResults.classification.suggested_category_name || 'Unknown'}</p>
                      <p><strong>Confidence:</strong> {testResults.classification.confidence_score}%</p>
                      <p><strong>Pattern Matched:</strong> {testResults.classification.pattern_matched || 'None'}</p>
                      {testResults.classification.pattern_matches && testResults.classification.pattern_matches.length > 0 && (
                        <p><strong>Pattern Matches:</strong> {testResults.classification.pattern_matches.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Results */}
                {testResults.validation && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      🔍 Validation Results
                    </h4>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      <p><strong>Valid:</strong> {testResults.validation.isValid ? '✅ Yes' : '❌ No'}</p>
                      <p><strong>Errors:</strong> {testResults.validation.errors.length}</p>
                      <p><strong>Warnings:</strong> {testResults.validation.warnings.length}</p>
                      <p><strong>Requires Approval:</strong> {testResults.validation.requiresApproval ? '⚠️ Yes' : '✅ No'}</p>
                      
                      {testResults.validation.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Error Messages:</p>
                          <ul className="list-disc list-inside ml-2">
                            {testResults.validation.errors.map((error, index) => (
                              <li key={index}>{error.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {testResults.validation.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Warning Messages:</p>
                          <ul className="list-disc list-inside ml-2">
                            {testResults.validation.warnings.map((warning, index) => (
                              <li key={index}>{warning.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {testResults.validation.requiresApproval && (
                        <p><strong>Approval Reason:</strong> {testResults.validation.approvalReason}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Analytics Results */}
                {testResults.analytics && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                      📈 Analytics Results
                    </h4>
                    <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                      <p><strong>Total Classifications:</strong> {testResults.analytics.totalClassifications}</p>
                      <p><strong>Accuracy Rate:</strong> {testResults.analytics.accuracyRate}%</p>
                      <p><strong>Manual Overrides:</strong> {testResults.analytics.manualOverrides}</p>
                      <p><strong>Average Confidence:</strong> {testResults.analytics.averageConfidence}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <TransactionDashboard key={refreshTrigger} onAddTransaction={handleAddTransaction} refreshTrigger={refreshTrigger} />
      case 'list':
        return <TransactionList key={refreshTrigger} onEdit={handleEdit} onDelete={handleDelete} refreshTrigger={refreshTrigger} />
      case 'reports':
        return <Reports key={refreshTrigger} />
      case 'categories':
        return <CategoryManagement key={refreshTrigger} />
      case 'test':
        return renderTestContent()
      default:
        return <TransactionDashboard key={refreshTrigger} onAddTransaction={handleAddTransaction} refreshTrigger={refreshTrigger} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Add Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manajemen Transaksi
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola pemasukan dan pengeluaran organisasi
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleAddTransaction}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <FaPlus className="h-4 w-4 mr-2" />
              Tambah Transaksi
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <tab.icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${isActive
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }
                    `}
                  />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderContent()}
      </motion.div>

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <TransactionForm
          isOpen={isFormOpen}
          initial={editingTransaction}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingTransaction(undefined)
          }}
          onSubmit={handleTransactionSubmit}
        />
      )}
    </div>
  )
}