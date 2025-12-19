import React, { useEffect, useState, useMemo } from 'react'
import {
  FaDownload,
  FaCalendarAlt,
  FaChartBar,
  FaChartPie,
  FaTable,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaEye
} from 'react-icons/fa'
import { motion } from 'framer-motion'
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
  Line,
  Legend
} from 'recharts'
import { Transaction, TransactionCategory, PaymentMethod } from '../../types/transactions'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Card } from '../UI/Card'
import { LoadingSpinner } from '../UI/LoadingSpinner'

type ReportType = 'summary' | 'category' | 'monthly' | 'payment_method'
type ExportFormat = 'excel' | 'pdf' | 'csv'

interface ReportData {
  summary: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    transactionCount: number
    avgTransactionAmount: number
  }
  categoryData: Array<{
    name: string
    income: number
    expense: number
    total: number
    count: number
    color: string
  }>
  monthlyData: Array<{
    month: string
    income: number
    expense: number
    net: number
  }>
  paymentMethodData: Array<{
    name: string
    amount: number
    count: number
    percentage: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export function Reports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 12) // Default to last 12 months
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [reportType, setReportType] = useState<ReportType>('summary')

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo, selectedCategories, selectedPaymentMethods])

  const fetchData = async () => {
    setLoading(true)
    try {
      // TODO: Implement MySQL API for transaction reports at /api/reports/transactions
      // For production, show empty state - data will come from real transactions
      setTransactions([])
      setCategories([])
      setPaymentMethods([])
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      toast.error('Gagal memuat data laporan')
    } finally {
      setLoading(false)
    }
  }

  const reportData: ReportData = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const netBalance = totalIncome - totalExpense
    const transactionCount = transactions.length
    const avgTransactionAmount = transactionCount > 0 ? (totalIncome + totalExpense) / transactionCount : 0

    // Category analysis
    const categoryMap = new Map<string, {
      name: string
      income: number
      expense: number
      count: number
      color: string
    }>()

    transactions.forEach(transaction => {
      const categoryId = transaction.category_id
      const categoryName = transaction.category?.name || 'Unknown'
      const categoryColor = transaction.category?.color_code || '#666666'

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          name: categoryName,
          income: 0,
          expense: 0,
          count: 0,
          color: categoryColor
        })
      }

      const category = categoryMap.get(categoryId)!
      if (transaction.transaction_type === 'income') {
        category.income += transaction.amount
      } else {
        category.expense += transaction.amount
      }
      category.count++
    })

    const categoryData = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      total: cat.income + cat.expense
    })).sort((a, b) => b.total - a.total)

    // Monthly analysis
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expense: 0 })
      }

      const monthData = monthlyMap.get(monthKey)!
      if (transaction.transaction_type === 'income') {
        monthData.income += transaction.amount
      } else {
        monthData.expense += transaction.amount
      }
    })

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'short'
        }),
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Payment method analysis
    const paymentMethodMap = new Map<string, { amount: number; count: number }>()

    transactions.forEach(transaction => {
      const methodId = transaction.payment_method_id

      if (!paymentMethodMap.has(methodId)) {
        paymentMethodMap.set(methodId, { amount: 0, count: 0 })
      }

      const methodData = paymentMethodMap.get(methodId)!
      methodData.amount += transaction.amount
      methodData.count++
    })

    const totalAmount = totalIncome + totalExpense
    const paymentMethodData = Array.from(paymentMethodMap.entries())
      .map(([methodId, data]) => {
        const method = paymentMethods.find(pm => pm.id === methodId)
        return {
          name: method?.name || 'Unknown',
          amount: data.amount,
          count: data.count,
          percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
        }
      })
      .sort((a, b) => b.amount - a.amount)

    return {
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        transactionCount,
        avgTransactionAmount
      },
      categoryData,
      monthlyData,
      paymentMethodData
    }
  }, [transactions, paymentMethods])

  const handleExport = async (format: ExportFormat) => {
    try {
      // This is a placeholder for export functionality
      // In a real implementation, you would generate the file and download it
      toast.success(`Export ${format.toUpperCase()} akan segera dimulai`)

      // Example implementation for CSV export
      if (format === 'csv') {
        const csvContent = generateCSV()
        downloadFile(csvContent, `laporan-transaksi-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Gagal mengekspor laporan')
    }
  }

  const generateCSV = () => {
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah', 'Metode Pembayaran', 'Status']
    const rows = transactions.map(t => [
      new Date(t.transaction_date).toLocaleDateString('id-ID'),
      t.description,
      t.category?.name || '',
      t.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.amount.toString(),
      t.payment_method?.name || '',
      t.status
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`
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
            Laporan Keuangan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analisis dan laporan transaksi keuangan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaFileExcel className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaDownload className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FaFilter className="h-5 w-5" />
            Filter Laporan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori
              </label>
              <select
                multiple
                value={selectedCategories}
                onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metode Pembayaran
              </label>
              <select
                multiple
                value={selectedPaymentMethods}
                onChange={(e) => setSelectedPaymentMethods(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'summary', label: 'Ringkasan', icon: FaChartBar },
          { key: 'category', label: 'Per Kategori', icon: FaChartPie },
          { key: 'monthly', label: 'Bulanan', icon: FaCalendarAlt },
          { key: 'payment_method', label: 'Metode Pembayaran', icon: FaTable }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setReportType(key as ReportType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${reportType === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {reportType === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Pemasukan</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.summary.totalIncome)}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportData.summary.totalExpense)}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Bersih</p>
                  <p className={`text-2xl font-bold ${reportData.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(reportData.summary.netBalance)}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${reportData.summary.netBalance >= 0
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-red-100 dark:bg-red-900'
                  }`}>
                  <FaChartBar className={`h-6 w-6 ${reportData.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Transaksi</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reportData.summary.transactionCount}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rata-rata: {formatCurrency(reportData.summary.avgTransactionAmount)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <FaTable className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        {(reportType === 'summary' || reportType === 'monthly') && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tren Bulanan
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelFormatter={(label) => `Bulan: ${label}`}
                  />
                  <Legend />
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
            </div>
          </Card>
        )}

        {/* Category Chart */}
        {(reportType === 'summary' || reportType === 'category') && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Distribusi per Kategori
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.categoryData.slice(0, 8)} // Show top 8 categories
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage?.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {reportData.categoryData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Detailed Tables */}
      {reportType === 'category' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Detail per Kategori
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pemasukan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pengeluaran
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {reportData.categoryData.map((category, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-green-600 font-medium">
                      {formatCurrency(category.income)}
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium">
                      {formatCurrency(category.expense)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(category.total)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {category.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {reportType === 'payment_method' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Detail per Metode Pembayaran
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Metode Pembayaran
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaksi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {reportData.paymentMethodData.map((method, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {method.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(method.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {method.count}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${method.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {method.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {transactions.length === 0 && (
        <Card className="p-12 text-center">
          <FaEye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Tidak Ada Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tidak ada transaksi yang ditemukan untuk periode dan filter yang dipilih.
          </p>
        </Card>
      )}
    </div>
  )
}