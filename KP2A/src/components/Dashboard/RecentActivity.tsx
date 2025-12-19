import React, { useEffect, useState } from 'react'
import { FaClock, FaDollarSign, FaCreditCard, FaReceipt } from 'react-icons/fa'
import { AnimatedListItem, AnimatedIcon } from '../UI/AnimatedComponents'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Activity {
  id: string
  type: 'due' | 'loan' | 'expense'
  description: string
  amount: number
  date: string
  member?: string
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivities()
  }, [])

  const fetchRecentActivities = async () => {
    try {
      setLoading(true)
      // TODO: Implement MySQL API endpoint for recent activities at /api/dashboard/recent-activity
      // For production, show empty state - data will come from real transactions
      setActivities([])
    } catch (error) {
      console.warn('Error fetching recent activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'due': return FaDollarSign
      case 'loan': return FaCreditCard
      case 'expense': return FaReceipt
      default: return FaClock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'due': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'loan': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'expense': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
    }
  }

  if (loading) {
    return (
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
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Aktivitas Terbaru</h3>
      <div className="space-y-3 sm:space-y-4">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type)
          return (
            <AnimatedListItem
              key={activity.id}
              index={index}
              className="flex items-center space-x-3"
            >
              <AnimatedIcon className={`p-2 rounded-full transition-colors ${getActivityColor(activity.type)}`}>
                <Icon className="h-4 w-4" />
              </AnimatedIcon>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {activity.description}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(activity.date), 'dd MMM yyyy, HH:mm', { locale: id })}
                </p>
              </div>
              <div className="flex-shrink-0">
                <p className={`text-xs sm:text-sm font-semibold ${activity.type === 'expense'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
                  }`}>
                  {activity.type === 'expense' ? '-' : '+'}Rp {(activity.amount || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </AnimatedListItem>
          )
        })}
        {activities.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada aktivitas</p>
        )}
      </div>
    </div>
  )
}