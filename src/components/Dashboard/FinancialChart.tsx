import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase, isSupabaseAvailable } from '../../lib/supabase'

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
      
      if (isSupabaseAvailable() && supabase) {
        const currentYear = new Date().getFullYear()
        const chartData: ChartData[] = []

        for (let month = 0; month < 6; month++) {
          const startDate = new Date(currentYear, month, 1)
          const endDate = new Date(currentYear, month + 1, 0)

          const [duesRes, expensesRes] = await Promise.all([
            supabase
              .from('dues')
              .select('iuran_wajib, iuran_sukarela')
              .gte('created_at', startDate.toISOString())
              .lt('created_at', endDate.toISOString()),
            supabase
              .from('expenses')
              .select('jumlah')
              .gte('created_at', startDate.toISOString())
              .lt('created_at', endDate.toISOString())
          ])

          const income = duesRes.data?.reduce((acc, due) => acc + due.iuran_wajib + due.iuran_sukarela, 0) || 0
          const expense = expensesRes.data?.reduce((acc, exp) => acc + exp.jumlah, 0) || 0

          chartData.push({
            month: startDate.toLocaleDateString('id-ID', { month: 'short' }),
            income,
            expense
          })
        }

        setData(chartData)
      } else {
        throw new Error('Supabase not available')
      }
    } catch (error) {
      console.warn('Error fetching chart data - using demo data:', error)
      // Use demo data when Supabase is not available
      const demoData = [
        { month: 'Jan', income: 2200000, expense: 800000 },
        { month: 'Feb', income: 2400000, expense: 750000 },
        { month: 'Mar', income: 2600000, expense: 900000 },
        { month: 'Apr', income: 2300000, expense: 850000 },
        { month: 'May', income: 2500000, expense: 800000 },
        { month: 'Jun', income: 2500000, expense: 850000 },
      ]
      setData(demoData)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Laporan Keuangan 6 Bulan Terakhir</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
          <Tooltip 
            formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
            labelStyle={{ color: '#374151' }}
          />
          <Legend />
          <Bar dataKey="income" fill="#10B981" name="Pemasukan" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#EF4444" name="Pengeluaran" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}