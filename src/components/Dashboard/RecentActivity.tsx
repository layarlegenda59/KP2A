import React, { useEffect, useState } from 'react'
import { Clock, DollarSign, CreditCard, Receipt } from 'lucide-react'
import { supabase, isSupabaseAvailable } from '../../lib/supabase'
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
      
      if (isSupabaseAvailable() && supabase) {
        const activities: Activity[] = []

        // Fetch recent dues
        const { data: dues } = await supabase
          .from('dues')
          .select(`
            id,
            iuran_wajib,
            iuran_sukarela,
            created_at,
            member:members(nama_lengkap)
          `)
          .order('created_at', { ascending: false })
          .limit(3)

        dues?.forEach(due => {
          activities.push({
            id: due.id,
            type: 'due',
            description: `Pembayaran iuran dari ${due.member?.nama_lengkap}`,
            amount: due.iuran_wajib + due.iuran_sukarela,
            date: due.created_at,
            member: due.member?.nama_lengkap
          })
        })

        // Fetch recent loans
        const { data: loans } = await supabase
          .from('loans')
          .select(`
            id,
            jumlah_pinjaman,
            created_at,
            member:members(nama_lengkap)
          `)
          .order('created_at', { ascending: false })
          .limit(2)

        loans?.forEach(loan => {
          activities.push({
            id: loan.id,
            type: 'loan',
            description: `Pinjaman baru dari ${loan.member?.nama_lengkap}`,
            amount: loan.jumlah_pinjaman,
            date: loan.created_at,
            member: loan.member?.nama_lengkap
          })
        })

        // Fetch recent expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('id, deskripsi, jumlah, created_at')
          .order('created_at', { ascending: false })
          .limit(2)

        expenses?.forEach(expense => {
          activities.push({
            id: expense.id,
            type: 'expense',
            description: expense.deskripsi,
            amount: expense.jumlah,
            date: expense.created_at
          })
        })

        // Sort by date and take top 7
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setActivities(activities.slice(0, 7))
      } else {
        throw new Error('Supabase not available')
      }
    } catch (error) {
      console.warn('Error fetching recent activities - using demo data:', error)
      // Use demo data when Supabase is not available
      const demoActivities: Activity[] = [
        {
          id: '1',
          type: 'due',
          description: 'Pembayaran iuran dari Budi Santoso',
          amount: 75000,
          date: new Date().toISOString()
        },
        {
          id: '2',
          type: 'loan',
          description: 'Pinjaman baru dari Siti Nurhaliza',
          amount: 2000000,
          date: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '3',
          type: 'expense',
          description: 'Pembelian alat tulis kantor',
          amount: 150000,
          date: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: '4',
          type: 'due',
          description: 'Pembayaran iuran dari Ahmad Rahman',
          amount: 70000,
          date: new Date(Date.now() - 259200000).toISOString()
        }
      ]
      setActivities(demoActivities)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'due': return DollarSign
      case 'loan': return CreditCard
      case 'expense': return Receipt
      default: return Clock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'due': return 'text-green-600 bg-green-50'
      case 'loan': return 'text-yellow-600 bg-yellow-50'
      case 'expense': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type)
          return (
            <div key={activity.id} className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.description}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(activity.date), 'dd MMM yyyy, HH:mm', { locale: id })}
                </p>
              </div>
              <div className="flex-shrink-0">
                <p className={`text-sm font-semibold ${
                  activity.type === 'expense' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {activity.type === 'expense' ? '-' : '+'}Rp {activity.amount.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )
        })}
        {activities.length === 0 && (
          <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
        )}
      </div>
    </div>
  )
}