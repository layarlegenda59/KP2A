import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FaChartBar } from 'react-icons/fa'

interface ChartData {
  month: string
  income: number
  expense: number
}

export function FinancialChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      // TODO: Implement MySQL API endpoint for chart data at /api/dashboard/financial-chart
      // For now, show empty state in production
      setData([])
    } catch (error) {
      console.warn('Error fetching chart data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="h-48 sm:h-64 bg-gray-100 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Laporan Keuangan 6 Bulan Terakhir</h3>
        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-400">
          <FaChartBar className="h-12 w-12 mb-3" />
          <p className="text-sm">Belum ada data keuangan</p>
          <p className="text-xs mt-1">Data akan muncul setelah transaksi tercatat</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Laporan Keuangan 6 Bulan Terakhir</h3>
      <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-600" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            className="dark:fill-gray-400"
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            className="dark:fill-gray-400"
          />
          <Tooltip
            formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
            labelStyle={{ color: '#374151' }}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            className="dark:[&>div]:!bg-gray-800 dark:[&>div]:!border-gray-600 dark:[&>div]:!text-gray-100"
          />
          <Legend
            wrapperStyle={{ fontSize: '14px', color: '#6B7280' }}
            className="dark:text-gray-400"
          />
          <Bar dataKey="income" fill="#10B981" name="Pemasukan" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#EF4444" name="Pengeluaran" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}