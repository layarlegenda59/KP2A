import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaChevronRight } from 'react-icons/fa'
import { motion } from 'framer-motion'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Default breadcrumb mapping based on routes
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/': [{ label: 'Dashboard', icon: FaHome }],
  '/dashboard': [{ label: 'Dashboard', icon: FaHome }],
  '/members': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Anggota' }
  ],
  '/members/add': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Anggota', path: '/members' },
    { label: 'Tambah Anggota' }
  ],
  '/dues': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Iuran' }
  ],
  '/dues/add': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Iuran', path: '/dues' },
    { label: 'Tambah Iuran' }
  ],
  '/loans': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Pinjaman' }
  ],
  '/loans/add': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Pinjaman', path: '/loans' },
    { label: 'Tambah Pinjaman' }
  ],
  '/expenses': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Pengeluaran' }
  ],
  '/expenses/add': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Pengeluaran', path: '/expenses' },
    { label: 'Tambah Pengeluaran' }
  ],
  '/reports': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Laporan' }
  ],
  '/reports/financial': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Laporan', path: '/reports' },
    { label: 'Laporan Keuangan' }
  ],
  '/reports/members': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Laporan', path: '/reports' },
    { label: 'Laporan Anggota' }
  ],
  '/admin': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Admin' }
  ],
  '/admin/users': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Admin', path: '/admin' },
    { label: 'Kelola Pengguna' }
  ],
  '/admin/backup': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Admin', path: '/admin' },
    { label: 'Backup & Restore' }
  ],
  '/profile': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'Profil' }
  ],
  '/whatsapp': [
    { label: 'Dashboard', path: '/', icon: FaHome },
    { label: 'WhatsApp' }
  ]
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const location = useLocation()
  
  // Use provided items or generate from current route
  const breadcrumbItems = items || routeMapping[location.pathname] || [
    { label: 'Dashboard', path: '/', icon: FaHome }
  ]

  if (breadcrumbItems.length <= 1) {
    return null // Don't show breadcrumb for single items
  }

  return (
    <nav 
      className={`flex items-center space-x-1 body-small text-secondary mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const IconComponent = item.icon
          
          return (
            <motion.li 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-center"
            >
              {index > 0 && (
                <FaChevronRight className="h-3 w-3 text-tertiary mx-2" />
              )}
              
              {item.path && !isLast ? (
                <Link
                  to={item.path}
                  className="flex items-center space-x-1 text-link hover:text-link-hover transition-colors duration-200 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span 
                  className={`flex items-center space-x-1 ${
                    isLast 
                      ? 'text-primary font-medium' 
                      : 'text-secondary'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </span>
              )}
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}

// Compact breadcrumb for mobile
export function CompactBreadcrumb({ items, className = '' }: BreadcrumbProps) {
  const location = useLocation()
  
  const breadcrumbItems = items || routeMapping[location.pathname] || [
    { label: 'Dashboard', path: '/', icon: FaHome }
  ]

  if (breadcrumbItems.length <= 1) {
    return null
  }

  const currentItem = breadcrumbItems[breadcrumbItems.length - 1]
  const parentItem = breadcrumbItems[breadcrumbItems.length - 2]

  return (
    <nav 
      className={`flex items-center space-x-1 body-small text-secondary mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center space-x-1"
      >
        {parentItem?.path ? (
          <Link
            to={parentItem.path}
            className="flex items-center space-x-1 text-link hover:text-link-hover transition-colors duration-200 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {parentItem.icon && (
              <parentItem.icon className="h-4 w-4" />
            )}
            <span>{parentItem.label}</span>
          </Link>
        ) : (
          <span className="flex items-center space-x-1">
            {parentItem?.icon && (
              <parentItem.icon className="h-4 w-4" />
            )}
            <span>{parentItem?.label}</span>
          </span>
        )}
        
        <FaChevronRight className="h-3 w-3 text-tertiary mx-2" />
        
        <span 
          className="flex items-center space-x-1 text-primary font-medium"
          aria-current="page"
        >
          {currentItem.icon && (
            <currentItem.icon className="h-4 w-4" />
          )}
          <span>{currentItem.label}</span>
        </span>
      </motion.div>
    </nav>
  )
}

// Hook to get current breadcrumb items
export function useBreadcrumb() {
  const location = useLocation()
  
  return routeMapping[location.pathname] || [
    { label: 'Dashboard', path: '/', icon: FaHome }
  ]
}