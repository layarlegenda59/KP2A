import React from 'react'
import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'white' | 'gray'
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    white: 'text-white',
    gray: 'text-gray-600 dark:text-gray-400'
  }

  return (
    <motion.div
      className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <svg
        className="w-full h-full"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  )
}

// Loading Button Component
interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function LoadingButton({
  loading = false,
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          color="white" 
          className="mr-2" 
        />
      )}
      <span className={loading ? 'opacity-75' : ''}>
        {children}
      </span>
    </button>
  )
}

// Loading Overlay Component
interface LoadingOverlayProps {
  show: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ 
  show, 
  message = 'Memuat...', 
  className = '' 
}: LoadingOverlayProps) {
  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center space-y-4"
      >
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </motion.div>
    </motion.div>
  )
}

// Inline Loading Component
interface InlineLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function InlineLoading({ 
  message = 'Memuat...', 
  size = 'md', 
  className = '' 
}: InlineLoadingProps) {
  return (
    <div className={`flex items-center justify-center space-x-3 py-4 ${className}`}>
      <LoadingSpinner size={size} />
      <span className="text-gray-600 dark:text-gray-400 font-medium">{message}</span>
    </div>
  )
}