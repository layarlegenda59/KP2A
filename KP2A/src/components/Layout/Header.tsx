import React, { useState } from 'react'
import { FaSearch, FaDatabase, FaBars } from 'react-icons/fa'
import { isDatabaseAvailable } from '../../lib/database'
import { useAuth } from '../../contexts/AuthContext'
import { NotificationDropdown } from '../Notifications/NotificationDropdown'
import ThemeToggle from '../UI/ThemeToggle'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { isDemo } = useAuth()
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label="Buka menu navigasi"
            aria-expanded="false"
          >
            <FaBars className="h-5 w-5" />
          </button>
          
          {/* Title */}
          <div>
            <h1 className="heading-2 text-primary">{title}</h1>
            {subtitle && (
              <p className="body-small text-secondary mt-1 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Search Bar - Hidden on mobile */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Cari..."
              className="input w-48 lg:w-64 pl-10 pr-4 py-2 focus-ring"
              aria-label="Cari konten"
            />
          </div>
          
          {/* Mobile Search Button */}
          <button 
            className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label="Buka pencarian"
          >
            <FaSearch className="h-5 w-5" />
          </button>
          
          {/* Notifications and Theme Toggle */}
          <div className="flex items-center space-x-3">
            {/* Supabase Status Indicator - Hidden on small screens */}
            <div className={`hidden sm:flex items-center px-2 py-1 rounded-full text-xs ${
              isDatabaseAvailable() && !isDemo
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }`}>
              <FaDatabase className="h-3 w-3 mr-1" />
              {isDatabaseAvailable() && !isDemo ? 'Terkoneksi dengan Server' : 'Terkoneksi dengan Server'}
            </div>
            
            <ThemeToggle />
            <NotificationDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}