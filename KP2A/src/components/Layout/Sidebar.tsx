import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaUsers, FaDollarSign, FaCreditCard, FaReceipt, FaChartBar, FaUpload, FaMobile, FaSignOutAlt, FaLock, FaChevronLeft, FaChevronRight, FaBullhorn, FaChevronDown, FaWhatsapp, FaHistory, FaAddressBook, FaPlug } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { useSidebar } from '../../contexts/SidebarContext'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  name: string
  href?: string
  icon: React.ComponentType<any>
  subItems?: NavItem[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: FaHome },
  { name: 'Data Anggota', href: '/members', icon: FaUsers },
  { name: 'Iuran', href: '/dues', icon: FaDollarSign },
  {
    name: 'Pinjaman',
    icon: FaCreditCard,
    subItems: [
      { name: 'Daftar Pinjaman', href: '/loans', icon: FaCreditCard },
      { name: 'Angsuran', href: '/loan-payments', icon: FaReceipt }
    ]
  },
  { name: 'Buku Kas', href: '/expenses', icon: FaReceipt },
  { name: 'Laporan', href: '/reports', icon: FaChartBar },
  { name: 'Upload CSV', href: '/upload', icon: FaUpload },
  {
    name: 'WhatsApp',
    icon: FaWhatsapp,
    subItems: [
      { name: 'Koneksi', href: '/whatsapp-mobile', icon: FaPlug },
      { name: 'Broadcast', href: '/broadcast', icon: FaBullhorn },
      { name: 'Kelola Kontak', href: '/broadcast/contacts', icon: FaAddressBook },
      { name: 'Riwayat', href: '/broadcast/history', icon: FaHistory }
    ]
  },
]

const adminNavigation = [
  { name: 'Manajemen Admin', href: '/admin', icon: FaLock },
]

export function Sidebar() {
  const location = useLocation()
  const { signOut, userProfile } = useAuth()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const sidebarVariants = {
    expanded: {
      width: '16rem', // w-64
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    collapsed: {
      width: '4rem', // w-16
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  }

  return (
    <motion.div
      className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-lg transition-colors relative"
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      initial="expanded"
    >
      {/* Logo Section */}
      <div className="h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {isCollapsed ? (
          /* Collapsed state: Only logo centered */
          <div className="flex items-center justify-center h-full">
            <img
              src="/Logo%20KP2A-Fix.png"
              alt="KP2A Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
        ) : (
          /* Expanded state: Logo with text */
          <div className="flex items-center h-full space-x-3">
            <img
              src="/Logo%20KP2A-Fix.png"
              alt="KP2A Logo"
              className="h-10 w-10 object-contain flex-shrink-0"
            />
            <motion.span
              className="text-lg font-semibold text-primary tracking-wide font-sans whitespace-nowrap"
              animate={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto'
              }}
              transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
            >
              SIDARSIH
            </motion.span>
          </div>
        )}
      </div>

      {/* Toggle Button Section */}
      <div className="px-2 py-2">
        <button
          onClick={toggleSidebar}
          className={clsx(
            "w-full flex items-center justify-center py-2 rounded-lg transition-all duration-200 group",
            "hover:bg-blue-50 dark:hover:bg-blue-900/20",
            "border border-transparent hover:border-blue-200 dark:hover:border-blue-800",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
            isCollapsed ? "px-2" : "px-3"
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <div className="flex items-center space-x-2">
              <FaChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <FaChevronLeft className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
              <motion.span
                className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto'
                }}
                transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
              >
                Tutup Menu
              </motion.span>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navigation.map((item) => {
          const isActive = item.href ? location.pathname === item.href : location.pathname.startsWith(`/${item.name.toLowerCase()}`)
          const hasSubItems = item.subItems && item.subItems.length > 0
          const isSubMenuOpen = expandedMenu === item.name
          const isAnySubItemActive = hasSubItems && item.subItems.some(sub => sub.href && location.pathname === sub.href)

          if (hasSubItems) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => setExpandedMenu(isSubMenuOpen ? null : item.name)}
                  className={clsx(
                    'w-full flex items-center rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative group',
                    isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                    isAnySubItemActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                      : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={clsx('h-5 w-5 flex-shrink-0', isCollapsed ? 'mr-0' : 'mr-3')} />
                  <motion.span
                    className="whitespace-nowrap overflow-hidden"
                    animate={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : 'auto'
                    }}
                    transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
                  >
                    {item.name}
                  </motion.span>
                  {!isCollapsed && (
                    <motion.div
                      className="ml-auto"
                      animate={{ rotate: isSubMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FaChevronDown className="h-4 w-4" />
                    </motion.div>
                  )}
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>

                {/* Submenu Items */}
                <AnimatePresence>
                  {isSubMenuOpen && !isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {item.subItems.map((subItem) => {
                        const isSubActive = subItem.href && location.pathname === subItem.href
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href!}
                            className={clsx(
                              'flex items-center rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative group ml-4 mt-1',
                              'px-4 py-2',
                              isSubActive
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600 dark:border-blue-400'
                                : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                            )}
                            aria-current={isSubActive ? 'page' : undefined}
                          >
                            <subItem.icon className="h-4 w-4 flex-shrink-0 mr-2" />
                            <span className="whitespace-nowrap overflow-hidden">{subItem.name}</span>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              to={item.href!}
              className={clsx(
                'flex items-center rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative group',
                isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={clsx('h-5 w-5 flex-shrink-0', isCollapsed ? 'mr-0' : 'mr-3')} />
              <motion.span
                className="whitespace-nowrap overflow-hidden"
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto'
                }}
                transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
              >
                {item.name}
              </motion.span>
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}

        {/* Admin Only Navigation */}
        {userProfile?.role === 'admin' && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
            {!isCollapsed && (
              <div className="px-4 py-2 mb-2">
                <motion.p
                  className="body-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                  animate={{
                    opacity: isCollapsed ? 0 : 1
                  }}
                  transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
                >
                  Admin
                </motion.p>
              </div>
            )}
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className={clsx(
                    'flex items-center rounded-lg label-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative group',
                    isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                      : 'text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={clsx('h-5 w-5 flex-shrink-0', isCollapsed ? 'mr-0' : 'mr-3')} />
                  <motion.span
                    className="whitespace-nowrap overflow-hidden"
                    animate={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : 'auto'
                    }}
                    transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
                  >
                    {item.name}
                  </motion.span>
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 py-5 border-t border-gray-200 dark:border-gray-700">
        <div className={clsx('flex items-center mb-4', isCollapsed ? 'justify-center' : '')}>
          <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="label-medium text-white">
              {userProfile?.member?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <motion.div
              className="ml-3 overflow-hidden"
              animate={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto'
              }}
              transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
            >
              <p className="label-medium text-primary whitespace-nowrap">
                {userProfile?.member?.nama_lengkap || 'User'}
              </p>
              <p className="body-xs text-tertiary capitalize whitespace-nowrap">{userProfile?.role}</p>
            </motion.div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={clsx(
            'flex items-center w-full py-3 label-medium text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative group',
            isCollapsed ? 'px-3 justify-center' : 'px-4'
          )}
          aria-label="Keluar dari aplikasi"
          title={isCollapsed ? 'Keluar' : undefined}
        >
          <FaSignOutAlt className={clsx('h-5 w-5 flex-shrink-0', isCollapsed ? 'mr-0' : 'mr-3')} />
          <motion.span
            className="whitespace-nowrap overflow-hidden"
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto'
            }}
            transition={{ duration: 0.2, delay: isCollapsed ? 0 : 0.1 }}
          >
            Keluar
          </motion.span>
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Keluar
            </div>
          )}
        </button>
      </div>
    </motion.div>
  )
}
