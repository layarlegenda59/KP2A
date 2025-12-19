import React, { useEffect, useState } from 'react'
import { FaUsers, FaDollarSign, FaCreditCard, FaReceipt } from 'react-icons/fa'
import { StatsCard } from './StatsCard'
import { FinancialChart } from './FinancialChart'
import { RecentActivity } from './RecentActivity'
import { QuickActions } from './QuickActions'
import { StatsCardSkeleton } from '../UI/SkeletonLoader'
import { PageTransition, AnimatedContainer } from '../UI/AnimatedComponents'
import { dashboardApi } from '../../lib/api'
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

      const { data, error } = await dashboardApi.getStats()

      if (error) throw new Error(error)

      if (data) {
        setSummary({
          total_members: data.total_members,
          total_dues_this_month: data.total_dues_this_month,
          total_loans_active: data.total_loans_active,
          total_expenses_this_month: data.total_expenses_this_month,
          cash_flow: {
            income: data.total_dues_this_month,
            expense: data.total_expenses_this_month,
            net: data.total_dues_this_month - data.total_expenses_this_month
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching dashboard data - using demo data:', error)
      // Use demo data when API fails
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
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts and Activity Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="h-48 sm:h-64 bg-gray-100 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <AnimatedContainer className="space-y-4 sm:space-y-6" staggerChildren={0.1}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Anggota"
            value={summary?.total_members || 0}
            icon={FaUsers}
            color="blue"
          />
          <StatsCard
            title="Iuran Bulan Ini"
            value={`Rp ${(summary?.total_dues_this_month || 0).toLocaleString('id-ID')}`}
            icon={FaDollarSign}
            color="green"
          />
          <StatsCard
            title="Pinjaman Aktif"
            value={summary?.total_loans_active || 0}
            icon={FaCreditCard}
            color="yellow"
          />
          <StatsCard
            title="Pengeluaran Bulan Ini"
            value={`Rp ${(summary?.total_expenses_this_month || 0).toLocaleString('id-ID')}`}
            icon={FaReceipt}
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-4 sm:mb-6">
          <QuickActions />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
      </AnimatedContainer>
    </PageTransition>
  )
}