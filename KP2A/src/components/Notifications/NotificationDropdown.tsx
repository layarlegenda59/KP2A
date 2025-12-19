import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaBell, FaTimes, FaCheck, FaCheckDouble, FaTrash, FaExternalLinkAlt, FaSync } from 'react-icons/fa'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    const opacity = isRead ? 'bg-opacity-50' : 'bg-opacity-100'
    switch (type) {
      case 'success':
        return `bg-green-50 ${opacity}`
      case 'warning':
        return `bg-yellow-50 ${opacity}`
      case 'error':
        return `bg-red-50 ${opacity}`
      default:
        return `bg-blue-50 ${opacity}`
    }
  }

  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200'
      case 'warning':
        return 'border-yellow-200'
      case 'error':
        return 'border-red-200'
      default:
        return 'border-blue-200'
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      >
        <FaBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifikasi
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-gray-500">({unreadCount} belum dibaca)</span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshNotifications}
                    disabled={loading}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh"
                  >
                    <FaSync className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Tandai semua sebagai dibaca"
                    >
                      <FaCheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Memuat notifikasi...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaBell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
                        getNotificationBgColor(notification.type, notification.is_read)
                      } border-l-4 ${getNotificationBorderColor(notification.type)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                notification.is_read ? 'text-gray-600' : 'text-gray-900'
                              }`}>
                                {notification.title}
                              </p>
                              <p className={`text-sm mt-1 ${
                                notification.is_read ? 'text-gray-500' : 'text-gray-700'
                              }`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: id
                                  })}
                                </p>
                                {notification.action_label && (
                                  <span className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800">
                                    {notification.action_label}
                                    <FaExternalLinkAlt className="h-3 w-3 ml-1" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Tandai sebagai dibaca"
                                >
                                  <FaCheck className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Hapus notifikasi"
                              >
                                <FaTrash className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to notifications page if exists
                    // window.location.href = '/notifications'
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Lihat Semua Notifikasi
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}