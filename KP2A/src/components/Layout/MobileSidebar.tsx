import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaUsers, FaDollarSign, FaCreditCard, FaReceipt, FaChartBar, FaUpload, FaComment, FaMobile, FaSignOutAlt, FaLock, FaTimes, FaUniversity, FaPiggyBank, FaExchangeAlt, FaBullhorn } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

const navigation = [
  { name: 'Dashboard', href: '/', icon: FaHome },
  { name: 'Data Anggota', href: '/members', icon: FaUsers },
  { name: 'Iuran', href: '/dues', icon: FaDollarSign },
  { name: 'Pinjaman', href: '/loans', icon: FaCreditCard },
  { name: 'Transaksi', href: '/transactions', icon: FaExchangeAlt },
  { name: 'Pengeluaran', href: '/expenses', icon: FaReceipt },
  { name: 'Laporan', href: '/reports', icon: FaChartBar },
  { name: 'Upload CSV', href: '/upload', icon: FaUpload },
  { name: 'WhatsApp Broadcast', href: '/broadcast', icon: FaBullhorn },
  { name: 'WhatsApp Mobile', href: '/whatsapp-mobile', icon: FaMobile },
]

const adminNavigation = [
  { name: 'Manajemen Admin', href: '/admin', icon: FaLock },
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const { signOut, userProfile } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleLinkClick = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Mobile Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-800 shadow-xl z-50 lg:hidden flex flex-col"
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <img
                  src="/Logo%20KP2A-Fix.png"
                  alt="KP2A Logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide font-sans">SIDARSIH</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href!}
                    onClick={handleLinkClick}
                    className={clsx(
                      'flex items-center px-5 py-4 rounded-lg label-large transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                        : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="mr-4 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Admin Only Navigation */}
              {userProfile?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
                  <div className="px-5 py-2 mb-2">
                    <p className="body-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Admin</p>
                  </div>
                  {adminNavigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href!}
                        onClick={handleLinkClick}
                        className={clsx(
                          'flex items-center px-5 py-4 rounded-lg label-large transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                            : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon className="mr-4 h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
            </nav>

            {/* User Info & Logout */}
            <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="label-large text-white">
                    {userProfile?.member?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-4">
                  <p className="label-large text-primary">
                    {userProfile?.member?.nama_lengkap || 'User'}
                  </p>
                  <p className="body-small text-secondary capitalize">{userProfile?.role}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-5 py-4 label-large text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label="Keluar dari aplikasi"
              >
                <FaSignOutAlt className="mr-4 h-5 w-5" />
                Keluar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}