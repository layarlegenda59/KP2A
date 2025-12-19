import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaUsers, FaDollarSign, FaCreditCard, FaReceipt, FaChartBar, FaUpload, FaMobile, FaSignOutAlt, FaLock, FaTimes, FaUniversity, FaPiggyBank, FaExchangeAlt, FaBullhorn } from 'react-icons/fa'
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

interface AnimatedSidebarProps {
  isOpen: boolean
  onClose: () => void
  isDesktop?: boolean
}

export function AnimatedSidebar({ isOpen, onClose, isDesktop = false }: AnimatedSidebarProps) {
  const location = useLocation()
  const { signOut, userProfile } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleLinkClick = () => {
    if (!isDesktop) {
      onClose()
    }
  }

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      // Prevent body scroll when sidebar is open on mobile
      if (!isDesktop) {
        document.body.style.overflow = 'hidden'
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      if (!isDesktop) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, onClose, isDesktop])

  const sidebarVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    open: {
      x: 0,
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  }

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.2
      }
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.2
      }
    }
  }

  const contentVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.1
      }
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: 0.1
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only for mobile/overlay mode */}
          {!isDesktop && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={backdropVariants}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={onClose}
            />
          )}

          {/* Sidebar */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className={clsx(
              'fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col',
              isDesktop ? 'w-80' : 'w-80 sm:w-96'
            )}
          >
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={contentVariants}
              className="flex flex-col h-full"
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <img
                    src="/Logo%20KP2A-Fix.png"
                    alt="KP2A Logo"
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-lg font-semibold text-primary tracking-wide font-sans">
                    SIDARSIH
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label="Tutup sidebar"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-6 py-8 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href!}
                      onClick={handleLinkClick}
                      className={clsx(
                        'flex items-center px-4 py-3 rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 dark:border-blue-400'
                          : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}

                {/* Admin Only Navigation */}
                {userProfile?.role === 'admin' && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
                    <div className="px-4 py-2 mb-2">
                      <p className="body-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Admin
                      </p>
                    </div>
                    {adminNavigation.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href!}
                          onClick={handleLinkClick}
                          className={clsx(
                            'flex items-center px-4 py-3 rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 dark:border-blue-400'
                              : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>

              {/* User Info & Logout */}
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="label-large text-white">
                      {userProfile?.member?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="label-medium text-primary">
                      {userProfile?.member?.nama_lengkap || 'User'}
                    </p>
                    <p className="body-xs text-tertiary capitalize">{userProfile?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-3 label-medium text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label="Keluar dari aplikasi"
                >
                  <FaSignOutAlt className="mr-3 h-5 w-5" />
                  Keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}