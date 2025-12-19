import React, { createContext, useContext, useEffect, useState } from 'react'
import { databaseClient, isDatabaseAvailable, withTimeout } from '../lib/database'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  action_url?: string
  action_label?: string
  created_at: string
  updated_at: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  createNotification: (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at' | 'updated_at'>) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const DEMO_NOTIFICATIONS_KEY = 'kp2a-demo-notifications'

// Demo notifications for offline mode
const createDemoNotifications = (): Notification[] => [
  {
    id: '1',
    user_id: 'demo-user',
    title: 'Selamat Datang di KP2A Cimahi',
    message: 'Terima kasih telah bergabung dengan sistem KP2A Cimahi. Silakan lengkapi profil Anda.',
    type: 'info',
    is_read: false,
    action_url: '/profile',
    action_label: 'Lengkapi Profil',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'demo-user',
    title: 'Pembayaran Iuran Berhasil',
    message: 'Pembayaran iuran bulan ini telah berhasil diproses.',
    type: 'success',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    user_id: 'demo-user',
    title: 'Pengingat Pembayaran',
    message: 'Jangan lupa untuk melakukan pembayaran iuran bulan depan.',
    type: 'warning',
    is_read: true,
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 172800000).toISOString()
  }
]

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isDemo } = useAuth()

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Load notifications
  const loadNotifications = async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    try {
      // Use demo mode for notifications since IndexedDB doesn't support notifications table
      const saved = localStorage.getItem(DEMO_NOTIFICATIONS_KEY)
      if (saved) {
        setNotifications(JSON.parse(saved))
      } else {
        const demoNotifications = createDemoNotifications()
        setNotifications(demoNotifications)
        localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(demoNotifications))
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Gagal memuat notifikasi')
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      // Demo mode - update localStorage
      const updated = notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      )
      setNotifications(updated)
      localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Gagal menandai notifikasi sebagai dibaca')
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return

    try {
      // Demo mode - update localStorage
      const updated = notifications.map(n => ({ ...n, is_read: true }))
      setNotifications(updated)
      localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated))
      toast.success('Semua notifikasi ditandai sebagai dibaca')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Gagal menandai semua notifikasi sebagai dibaca')
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      // Demo mode - update localStorage
      const updated = notifications.filter(n => n.id !== id)
      setNotifications(updated)
      localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated))
      toast.success('Notifikasi dihapus')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Gagal menghapus notifikasi')
    }
  }

  // Create new notification
  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at' | 'updated_at'>) => {
    if (!user) return

    try {
      const newNotification = {
        ...notification,
        user_id: user.id,
        is_read: false
      }

      // Demo mode - add to localStorage
      const demoNotification: Notification = {
        ...newNotification,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const updated = [demoNotification, ...notifications]
      setNotifications(updated)
      localStorage.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated))
      toast.success('Notifikasi dibuat')
    } catch (error) {
      console.error('Error creating notification:', error)
      toast.error('Gagal membuat notifikasi')
    }
  }

  // Refresh notifications
  const refreshNotifications = async () => {
    setLoading(true)
    await loadNotifications()
  }

  // Load notifications when user changes
  useEffect(() => {
    loadNotifications()
  }, [user, isDemo])

  // Note: Real-time subscription is not available with IndexedDB
  // Using demo mode for notifications

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refreshNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}