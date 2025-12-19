import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FaPlus, 
  FaUsers, 
  FaDollarSign, 
  FaCreditCard, 
  FaReceipt, 
  FaFileAlt,
  FaWhatsapp,
  FaDownload,
  FaSearch,
  FaChartLine
} from 'react-icons/fa'
import { AnimatedCard, AnimatedIcon } from '../UI/AnimatedComponents'

interface QuickActionItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo'
  shortcut?: string
}

const quickActions: QuickActionItem[] = [
  {
    id: 'add-member',
    title: 'Tambah Anggota',
    description: 'Daftarkan anggota baru',
    icon: FaUsers,
    path: '/members?action=add',
    color: 'blue',
    shortcut: 'Ctrl+M'
  },
  {
    id: 'add-dues',
    title: 'Catat Iuran',
    description: 'Input pembayaran iuran',
    icon: FaDollarSign,
    path: '/dues?action=add',
    color: 'green',
    shortcut: 'Ctrl+I'
  },
  {
    id: 'add-loan',
    title: 'Buat Pinjaman',
    description: 'Proses pinjaman baru',
    icon: FaCreditCard,
    path: '/loans?action=add',
    color: 'yellow',
    shortcut: 'Ctrl+P'
  },
  {
    id: 'add-expense',
    title: 'Catat Pengeluaran',
    description: 'Input pengeluaran koperasi',
    icon: FaReceipt,
    path: '/expenses?action=add',
    color: 'red',
    shortcut: 'Ctrl+E'
  },
  {
    id: 'financial-report',
    title: 'Laporan Keuangan',
    description: 'Lihat laporan keuangan',
    icon: FaChartLine,
    path: '/reports?action=add',
    color: 'purple',
    shortcut: 'Ctrl+R'
  },
  {
    id: 'whatsapp',
    title: 'Kirim WhatsApp',
    description: 'Broadcast pesan anggota',
    icon: FaWhatsapp,
    path: '/whatsapp',
    color: 'green',
    shortcut: 'Ctrl+W'
  }
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-200 dark:ring-blue-800',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-200 dark:ring-green-800',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
    hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/30'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-200 dark:ring-purple-800',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
    hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
  }
}

interface QuickActionsProps {
  className?: string
  showTitle?: boolean
  compact?: boolean
}

export function QuickActions({ 
  className = '', 
  showTitle = true, 
  compact = false 
}: QuickActionsProps) {
  const navigate = useNavigate()
  
  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const action = quickActions.find(action => {
          const shortcut = action.shortcut?.toLowerCase()
          const key = event.key.toLowerCase()
          return shortcut?.includes(key)
        })
        
        if (action) {
          event.preventDefault()
          // Navigate using React Router
          navigate(action.path)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className={className}>
      {showTitle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Aksi Cepat
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Gunakan keyboard shortcuts untuk akses cepat
          </div>
        </motion.div>
      )}
      
      <div className={`grid gap-3 ${
        compact 
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' 
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {quickActions.map((action, index) => {
          const colorClass = colorClasses[action.color]
          const IconComponent = action.icon
          
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link 
                to={action.path}
                aria-label={`${action.title} - ${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`}
                className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-xl"
              >
                <AnimatedCard
                  className={`p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 ${colorClass.hover} group`}
                  hoverScale={1.02}
                  hoverY={-2}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start space-x-3">
                    <AnimatedIcon 
                      className={`p-2 rounded-lg ring-4 ${colorClass.bg} ${colorClass.text} ${colorClass.ring} group-hover:scale-110 transition-transform duration-200`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </AnimatedIcon>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {action.title}
                      </h4>
                      {!compact && (
                        <>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {action.description}
                          </p>
                          {action.shortcut && (
                            <div className="mt-2">
                              <span 
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                aria-label={`Keyboard shortcut: ${action.shortcut}`}
                              >
                                {action.shortcut}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              </Link>
            </motion.div>
          )
        })}
      </div>
      
      {/* Keyboard shortcuts help */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
            <FaSearch className="h-4 w-4" />
            <span className="font-medium">Tips:</span>
            <span>Gunakan Ctrl + huruf untuk akses cepat (contoh: Ctrl+M untuk tambah anggota)</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Floating Quick Actions Button
export function FloatingQuickActions() {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  
  // Handle escape key and outside clicks
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Quick actions menu */}
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-16 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 mb-2"
          role="menu"
          aria-label="Quick actions menu"
        >
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Aksi Cepat
          </h4>
          <div className="space-y-2">
            {quickActions.slice(0, 4).map((action) => {
              const IconComponent = action.icon
              const colorClass = colorClasses[action.color]
              
              return (
                <Link
                  key={action.id}
                  to={action.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  role="menuitem"
                  aria-label={`${action.title} - ${action.description} (${action.shortcut})`}
                >
                  <div className={`p-1.5 rounded ${colorClass.bg} ${colorClass.text}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {action.shortcut}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}
      
      {/* Toggle button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        aria-label={isOpen ? 'Close quick actions menu' : 'Open quick actions menu'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <FaPlus className="h-6 w-6 mx-auto" />
      </motion.button>
    </div>
  )
}