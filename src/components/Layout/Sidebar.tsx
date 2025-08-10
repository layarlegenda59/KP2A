import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Users, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  Upload,
  MessageSquare,
  Code,
  LogOut,
  Building2,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign as PaymentIcon
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Data Anggota', href: '/members', icon: Users },
  { name: 'Iuran', href: '/dues', icon: DollarSign },
  { 
    name: 'Pinjaman', 
    icon: CreditCard,
    submenu: [
      { name: 'Data Pinjaman', href: '/loans', icon: CreditCard },
      { name: 'Pembayaran Angsuran', href: '/loan-payments', icon: PaymentIcon },
      { name: 'Jadwal Angsuran', href: '/loan-schedule', icon: Calendar }
    ]
  },
  { name: 'Pengeluaran', href: '/expenses', icon: Receipt },
  { name: 'Laporan', href: '/reports', icon: BarChart3 },
  { name: 'Upload CSV', href: '/upload', icon: Upload },
  { name: 'WhatsApp Bot', href: '/whatsapp', icon: MessageSquare },
]

export function Sidebar() {
  const location = useLocation()
  const { signOut, userProfile } = useAuth()
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(['Pinjaman'])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div className="text-lg font-bold text-gray-900">
            KP2A Cimahi
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          if ('submenu' in item) {
            const isExpanded = expandedMenus.includes(item.name)
            const hasActiveSubmenu = item.submenu?.some(sub => location.pathname === sub.href)
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    setExpandedMenus(prev => 
                      isExpanded 
                        ? prev.filter(name => name !== item.name)
                        : [...prev, item.name]
                    )
                  }}
                  className={clsx(
                    'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    hasActiveSubmenu
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {isExpanded && item.submenu && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem) => {
                      const isActive = location.pathname === subItem.href
                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={clsx(
                            'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <subItem.icon className="mr-3 h-4 w-4" />
                          {subItem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          } else {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href!}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          }
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {userProfile?.member?.nama_lengkap?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {userProfile?.member?.nama_lengkap || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  )
}