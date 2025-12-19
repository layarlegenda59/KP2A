import { databaseClient, isDatabaseAvailable } from '../lib/database'
import { Notification } from '../contexts/NotificationContext'

// Helper functions to create notifications for various events

export const createWelcomeNotification = async (userId: string) => {
  const notification = {
    user_id: userId,
    title: 'Selamat Datang di KP2A Cimahi',
    message: 'Terima kasih telah bergabung dengan sistem KP2A Cimahi. Silakan lengkapi profil Anda untuk pengalaman yang lebih baik.',
    type: 'info' as const,
    action_url: '/profile',
    action_label: 'Lengkapi Profil'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating welcome notification:', error)
    }
  }
}

export const createDuesPaymentNotification = async (userId: string, memberName: string, amount: number, month: string) => {
  const notification = {
    user_id: userId,
    title: 'Pembayaran Iuran Berhasil',
    message: `Pembayaran iuran ${month} sebesar Rp ${amount.toLocaleString('id-ID')} telah berhasil diproses.`,
    type: 'success' as const,
    action_url: '/dues',
    action_label: 'Lihat Riwayat Iuran'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating dues payment notification:', error)
    }
  }
}

export const createLoanApprovalNotification = async (userId: string, loanAmount: number, status: 'approved' | 'rejected') => {
  const notification = {
    user_id: userId,
    title: status === 'approved' ? 'Pinjaman Disetujui' : 'Pinjaman Ditolak',
    message: status === 'approved' 
      ? `Pengajuan pinjaman sebesar Rp ${loanAmount.toLocaleString('id-ID')} telah disetujui.`
      : `Pengajuan pinjaman sebesar Rp ${loanAmount.toLocaleString('id-ID')} ditolak. Silakan hubungi admin untuk informasi lebih lanjut.`,
    type: status === 'approved' ? 'success' as const : 'warning' as const,
    action_url: '/loans',
    action_label: 'Lihat Detail Pinjaman'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating loan approval notification:', error)
    }
  }
}

export const createLoanPaymentReminderNotification = async (userId: string, dueDate: string, amount: number) => {
  const notification = {
    user_id: userId,
    title: 'Pengingat Pembayaran Angsuran',
    message: `Jangan lupa melakukan pembayaran angsuran sebesar Rp ${amount.toLocaleString('id-ID')} yang jatuh tempo pada ${dueDate}.`,
    type: 'warning' as const,
    action_url: '/loans/payments',
    action_label: 'Bayar Angsuran'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating loan payment reminder notification:', error)
    }
  }
}

export const createExpenseApprovalNotification = async (userId: string, expenseDescription: string, amount: number, status: 'approved' | 'rejected') => {
  const notification = {
    user_id: userId,
    title: status === 'approved' ? 'Pengeluaran Disetujui' : 'Pengeluaran Ditolak',
    message: status === 'approved'
      ? `Pengajuan pengeluaran "${expenseDescription}" sebesar Rp ${amount.toLocaleString('id-ID')} telah disetujui.`
      : `Pengajuan pengeluaran "${expenseDescription}" sebesar Rp ${amount.toLocaleString('id-ID')} ditolak.`,
    type: status === 'approved' ? 'success' as const : 'warning' as const,
    action_url: '/expenses',
    action_label: 'Lihat Detail Pengeluaran'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating expense approval notification:', error)
    }
  }
}

export const createReportGeneratedNotification = async (userId: string, reportType: string, period: string) => {
  const notification = {
    user_id: userId,
    title: 'Laporan Keuangan Tersedia',
    message: `Laporan ${reportType} untuk periode ${period} telah berhasil dibuat dan siap untuk dilihat.`,
    type: 'info' as const,
    action_url: '/reports',
    action_label: 'Lihat Laporan'
  }

  if (isDatabaseAvailable()) {
    try {
      const { error } = await databaseClient
        .from('notifications')
        .insert([notification])
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating report generated notification:', error)
    }
  }
}

export const createSystemMaintenanceNotification = async (userIds: string[], maintenanceDate: string) => {
  const notification = {
    title: 'Pemeliharaan Sistem Terjadwal',
    message: `Sistem akan menjalani pemeliharaan pada ${maintenanceDate}. Layanan mungkin tidak tersedia sementara.`,
    type: 'warning' as const
  }

  if (isDatabaseAvailable()) {
    try {
      const notifications = userIds.map(userId => ({
        ...notification,
        user_id: userId
      }))

      const { error } = await databaseClient
        .from('notifications')
        .insert(notifications)
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating system maintenance notifications:', error)
    }
  }
}

export const createBulkNotification = async (userIds: string[], title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', actionUrl?: string, actionLabel?: string) => {
  const baseNotification = {
    title,
    message,
    type,
    action_url: actionUrl,
    action_label: actionLabel
  }

  if (isDatabaseAvailable()) {
    try {
      const notifications = userIds.map(userId => ({
        ...baseNotification,
        user_id: userId
      }))

      const { error } = await databaseClient
        .from('notifications')
        .insert(notifications)
        
      
      if (error) {
        // If notifications table doesn't exist, silently fail
        if (error.code === 'PGRST205' || error.message?.includes('notifications')) {
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
    }
  }
}

// Function to get all user IDs for bulk notifications
export const getAllUserIds = async (): Promise<string[]> => {
  if (!isDatabaseAvailable()) return []

  try {
    const { data, error } = await databaseClient
      .from('users')
      .select('id')
      
    
    if (error) throw error
    return data?.map(user => user.id) || []
  } catch (error) {
    console.error('Error getting user IDs:', error)
    return []
  }
}

// Function to get user IDs by role
export const getUserIdsByRole = async (role: 'admin' | 'pengurus' | 'anggota'): Promise<string[]> => {
  if (!isDatabaseAvailable()) return []

  try {
    const { data, error } = await databaseClient
      .from('users')
      .select('id')
      .eq('role', role)
      
    
    if (error) throw error
    return data?.map(user => user.id) || []
  } catch (error) {
    console.error('Error getting user IDs by role:', error)
    return []
  }
}