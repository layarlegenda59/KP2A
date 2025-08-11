import React from 'react'
import { Search, Database } from 'lucide-react'
import { isSupabaseAvailable } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationDropdown } from '../Notifications/NotificationDropdown'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isDemo } = useAuth()
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-2">
            {/* Supabase Status Indicator */}
            <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
              isSupabaseAvailable() && !isDemo
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <Database className="h-3 w-3 mr-1" />
              {isSupabaseAvailable() && !isDemo ? 'Terkoneksi dengan Server' : 'Terkoneksi dengan Server'}
            </div>
            
          <NotificationDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}