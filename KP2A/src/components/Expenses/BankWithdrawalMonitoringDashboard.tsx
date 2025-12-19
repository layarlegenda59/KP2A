import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card'
import { Button } from '../UI/Button'
import { 
  FaRobot, 
  FaCheck, 
  FaTimes, 
  FaChartLine, 
  FaExclamationTriangle,
  FaEye,
  FaCog,
  FaRefresh,
  FaPercent,
  FaClipboardList,
  FaUserEdit
} from 'react-icons/fa'
import { LoadingSpinner } from '../UI/LoadingSpinner'
import { bankWithdrawalClassificationService } from '../../services/bankWithdrawalClassificationService'
import { formatCurrency } from '../../utils/formatters'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  Area,
  AreaChart
} from 'recharts'

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6']

interface ClassificationMetrics {
  totalClassifications: number
  accurateClassifications: number
  accuracyRate: number
  manualOverrides: number
  overrideRate: number
  avgConfidenceScore: number
  topPatterns: Array<{
    pattern_name: string
    usage_count: number
    accuracy_rate: number
  }>
  dailyStats: Array<{
    date: string
    classifications: number
    accurate: number
    overrides: number
    accuracy_rate: number
  }>
  categoryAccuracy: Array<{
    category_name: string
    total_suggestions: number
    accurate_suggestions: number
    accuracy_rate: number
  }>
  confidenceDistribution: Array<{
    range: string
    count: number
    accuracy_rate: number
  }>
}

interface BankWithdrawalMonitoringDashboardProps {
  className?: string
}

export function BankWithdrawalMonitoringDashboard({ className = '' }: BankWithdrawalMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<ClassificationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadMetrics()
  }, [timeRange])

  const loadMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const analytics = await bankWithdrawalClassificationService.getClassificationAnalytics(timeRange)
      setMetrics(analytics)
    } catch (err) {
      console.error('Failed to load classification metrics:', err)
      setError('Gagal memuat data monitoring')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadMetrics()
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400'
    if (rate >= 80) return 'text-yellow-600 dark:text-yellow-400'
    if (rate >= 70) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getAccuracyBgColor = (rate: number) => {
    if (rate >= 90) return 'bg-gradient-to-r from-green-500 to-green-600'
    if (rate >= 80) return 'bg-gradient-to-r from-yellow-500 to-yellow-600'
    if (rate >= 70) return 'bg-gradient-to-r from-orange-500 to-orange-600'
    return 'bg-gradient-to-r from-red-500 to-red-600'
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Monitoring Klasifikasi Bank Withdrawal
          </h2>
          <Button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            <FaRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <FaExclamationTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Tidak ada data monitoring tersedia</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Monitoring Klasifikasi Bank Withdrawal
        </h2>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {range === '7d' ? '7 Hari' : range === '30d' ? '30 Hari' : '90 Hari'}
              </button>
            ))}
          </div>
          
          <Button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            <FaRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Classifications */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Klasifikasi</p>
                <p className="text-2xl font-bold">{metrics.totalClassifications.toLocaleString()}</p>
                <p className="text-blue-100 text-xs mt-1">
                  {timeRange === '7d' ? '7 hari terakhir' : timeRange === '30d' ? '30 hari terakhir' : '90 hari terakhir'}
                </p>
              </div>
              <FaRobot className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Rate */}
        <Card className={`${getAccuracyBgColor(metrics.accuracyRate)} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Tingkat Akurasi</p>
                <p className="text-2xl font-bold">{metrics.accuracyRate.toFixed(1)}%</p>
                <p className="text-white/80 text-xs mt-1">
                  {metrics.accurateClassifications} dari {metrics.totalClassifications}
                </p>
              </div>
              <FaPercent className="w-8 h-8 text-white/60" />
            </div>
          </CardContent>
        </Card>

        {/* Manual Overrides */}
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Manual Override</p>
                <p className="text-2xl font-bold">{metrics.manualOverrides}</p>
                <p className="text-orange-100 text-xs mt-1">
                  {metrics.overrideRate.toFixed(1)}% dari total
                </p>
              </div>
              <FaUserEdit className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        {/* Average Confidence */}
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Rata-rata Confidence</p>
                <p className="text-2xl font-bold">{metrics.avgConfidenceScore.toFixed(1)}%</p>
                <p className="text-purple-100 text-xs mt-1">
                  Skor kepercayaan AI
                </p>
              </div>
              <FaClipboardList className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Classification Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="w-5 h-5 text-blue-600" />
              Tren Klasifikasi Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID')}
                    formatter={(value: any, name: string) => {
                      if (name === 'accuracy_rate') return [`${value.toFixed(1)}%`, 'Akurasi']
                      return [value, name === 'classifications' ? 'Klasifikasi' : name === 'accurate' ? 'Akurat' : 'Override']
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="classifications" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="overrides" 
                    stackId="1"
                    stroke="#F59E0B" 
                    fill="#F59E0B"
                    fillOpacity={0.6}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy_rate" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaPercent className="w-5 h-5 text-purple-600" />
              Distribusi Confidence Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.confidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'accuracy_rate') return [`${value.toFixed(1)}%`, 'Akurasi']
                      return [value, 'Jumlah']
                    }}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy_rate" 
                    stroke="#10B981" 
                    strokeWidth={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaCheck className="w-5 h-5 text-green-600" />
              Akurasi per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.categoryAccuracy.slice(0, 8).map((category, index) => (
                <div key={category.category_name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.category_name}
                      </span>
                      <span className={`text-sm font-medium ${getAccuracyColor(category.accuracy_rate)}`}>
                        {category.accuracy_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          category.accuracy_rate >= 90 ? 'bg-green-500' :
                          category.accuracy_rate >= 80 ? 'bg-yellow-500' :
                          category.accuracy_rate >= 70 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${category.accuracy_rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{category.accurate_suggestions} akurat</span>
                      <span>{category.total_suggestions} total</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Patterns Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaCog className="w-5 h-5 text-blue-600" />
              Performa Pattern Teratas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topPatterns.slice(0, 6).map((pattern, index) => (
                <div key={pattern.pattern_name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {pattern.pattern_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {pattern.usage_count}x
                        </span>
                        <span className={`text-sm font-medium ${getAccuracyColor(pattern.accuracy_rate)}`}>
                          {pattern.accuracy_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          pattern.accuracy_rate >= 90 ? 'bg-green-500' :
                          pattern.accuracy_rate >= 80 ? 'bg-yellow-500' :
                          pattern.accuracy_rate >= 70 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pattern.accuracy_rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      {(metrics.accuracyRate < 80 || metrics.overrideRate > 20) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <FaExclamationTriangle className="w-5 h-5" />
              Peringatan Performa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.accuracyRate < 80 && (
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <FaTimes className="w-4 h-4" />
                  <span>Tingkat akurasi di bawah 80% ({metrics.accuracyRate.toFixed(1)}%)</span>
                </div>
              )}
              {metrics.overrideRate > 20 && (
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <FaEye className="w-4 h-4" />
                  <span>Tingkat manual override tinggi ({metrics.overrideRate.toFixed(1)}%)</span>
                </div>
              )}
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                Pertimbangkan untuk meninjau dan memperbarui pattern klasifikasi atau melatih ulang model.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}