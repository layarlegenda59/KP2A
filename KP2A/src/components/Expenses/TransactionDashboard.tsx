import React, { useEffect, useState, useMemo } from 'react'
import {
  FaArrowUp,
  FaArrowDown,
  FaBalanceScale,
  FaChartLine,
  FaClock,
  FaCheck,
  FaTimes,
  FaPlus
} from 'react-icons/fa'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { motion } from 'framer-motion'
import { Transaction, TransactionSummary, MonthlyTransactionData, CategorySummary } from '../../types/transactions'
import toast from 'react-hot-toast'
import { Card } from '../UI/Card'
import { LoadingSpinner } from '../UI/LoadingSpinner'

interface TransactionDashboardProps {
  onAddTransaction: () => void
  refreshTrigger?: number
}

export function TransactionDashboard({ onAddTransaction, refreshTrigger }: TransactionDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<TransactionSummary>({
    total_income: 0,
    total_expense: 0,
    net_amount: 0,
    transaction_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyTransactionData[]>([])
  const [categoryData, setCategoryData] = useState<CategorySummary[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [refreshTrigger])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // TODO: Implement MySQL API endpoints for transactions dashboard at /api/dashboard/transactions
      // For production, show empty state - data will come from real transactions
      setSummary({
        total_income: 0,
        total_expense: 0,
        net_amount: 0,
        transaction_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0
      })
      setMonthlyData([])
      setCategoryData([])
      setRecentTransactions([])

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }

  const pieColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">
                  Rp {summary.total_income.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <FaArrowUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">
                  Rp {summary.total_expense.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <FaArrowDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo Bersih</p>
                <p className={`text-2xl font-bold ${summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp {summary.net_amount.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <FaBalanceScale className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summary.transaction_count}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-yellow-600">
                    <FaClock className="h-3 w-3" />
                    {summary.pending_count}
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <FaCheck className="h-3 w-3" />
                    {summary.approved_count}
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <FaTimes className="h-3 w-3" />
                    {summary.rejected_count}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <FaChartLine className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tren Bulanan
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
                  labelFormatter={(label) => `Bulan: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Pemasukan"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Pengeluaran"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Saldo Bersih"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Breakdown Kategori
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color_code || pieColors[index % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Transaksi Terbaru
            </h3>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${transaction.transaction_type === 'income'
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-red-100 dark:bg-red-900'
                      }`}>
                      {transaction.transaction_type === 'income' ? (
                        <FaArrowUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <FaArrowDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.category?.name} • {transaction.payment_method?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.transaction_type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                      }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      Rp {transaction.amount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.transaction_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Aksi Cepat
            </h3>
            <div className="space-y-3">
              <button
                onClick={onAddTransaction}
                className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="h-4 w-4" />
                Tambah Transaksi
              </button>
              <button
                onClick={() => window.location.href = '/expenses/categories'}
                className="w-full flex items-center gap-3 p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaChartLine className="h-4 w-4" />
                Kelola Kategori
              </button>
              <button
                onClick={() => window.location.href = '/expenses/reports'}
                className="w-full flex items-center gap-3 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaBalanceScale className="h-4 w-4" />
                Lihat Laporan
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}