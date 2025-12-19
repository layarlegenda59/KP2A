import React, { useEffect, useState } from 'react'
import { Users, DollarSign, CreditCard, Receipt } from 'lucide-react'
import { StatsCard } from './StatsCard'
import { FinancialChart } from './FinancialChart'
import { RecentActivity } from './RecentActivity'
import { supabase, isSupabaseAvailable } from '../../lib/supabase'
import { FinancialSummary } from '../../types'
import { motion } from 'framer-motion'

export function Dashboard() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (isSupabaseAvailable() && supabase) {
        // Fetch basic counts
        const [membersRes, duesRes, loansRes, expensesRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact' }),
          supabase.from('dues').select('iuran_wajib, iuran_sukarela').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('loans').select('id, sisa_pinjaman').eq('status', 'aktif'),
          supabase.from('expenses').select('jumlah').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ])

        const totalMembers = membersRes.count || 0
        const totalDuesThisMonth = duesRes.data?.reduce((acc, due) => acc + due.iuran_wajib + due.iuran_sukarela, 0) || 0
        const totalLoansActive = loansRes.data?.length || 0
        const totalExpensesThisMonth = expensesRes.data?.reduce((acc, expense) => acc + expense.jumlah, 0) || 0

        setSummary({
          total_members: totalMembers,
          total_dues_this_month: totalDuesThisMonth,
          total_loans_active: totalLoansActive,
          total_expenses_this_month: totalExpensesThisMonth,
          cash_flow: {
            income: totalDuesThisMonth,
            expense: totalExpensesThisMonth,
            net: totalDuesThisMonth - totalExpensesThisMonth
          }
        })
      } else {
        throw new Error('Supabase not available')
      }
    } catch (error) {
      console.warn('Error fetching dashboard data - using demo data:', error)
      // Use demo data when Supabase is not available
      setSummary({
        total_members: 25,
        total_dues_this_month: 2500000,
        total_loans_active: 8,
        total_expenses_this_month: 850000,
        cash_flow: {
          income: 2500000,
          expense: 850000,
          net: 1650000
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Anggota"
          value={summary?.total_members || 0}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Iuran Bulan Ini"
          value={`Rp ${(summary?.total_dues_this_month || 0).toLocaleString('id-ID')}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Pinjaman Aktif"
          value={summary?.total_loans_active || 0}
          icon={CreditCard}
          color="yellow"
        />
        <StatsCard
          title="Pengeluaran Bulan Ini"
          value={`Rp ${(summary?.total_expenses_this_month || 0).toLocaleString('id-ID')}`}
          icon={Receipt}
          color="red"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FinancialChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <RecentActivity />
        </motion.div>
      </div>
    </div>
  )
}