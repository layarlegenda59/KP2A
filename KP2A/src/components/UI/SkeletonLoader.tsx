import React from 'react'
import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  animate?: boolean
}

// Base Skeleton Component
export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 rounded'
  
  if (animate) {
    return (
      <motion.div
        className={`${baseClasses} ${className}`}
        animate={{
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    )
  }

  return <div className={`${baseClasses} ${className}`} />
}

// Card Skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// Stats Card Skeleton
export function StatsCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="animate-pulse">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        
        {/* Table Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// List Skeleton
export function ListSkeleton({ 
  items = 5, 
  showAvatar = true, 
  className = '' 
}: { 
  items?: number
  showAvatar?: boolean
  className?: string 
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        {/* Header */}
        <Skeleton className="h-6 w-32 mb-4" />
        
        {/* List Items */}
        <div className="space-y-3">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Form Skeleton
export function FormSkeleton({ 
  fields = 6, 
  columns = 2, 
  className = '' 
}: { 
  fields?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${className}`}>
      <div className="animate-pulse space-y-6">
        {/* Form Title */}
        <Skeleton className="h-6 w-48" />
        
        {/* Form Fields */}
        <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-4 sm:gap-6`}>
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className={i === fields - 1 && fields % 2 === 1 && columns === 2 ? 'sm:col-span-2' : ''}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        
        {/* Form Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <Skeleton className="h-10 w-full sm:w-20 rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Chart Title */}
        <Skeleton className="h-6 w-48 mb-4" />
        
        {/* Chart Area */}
        <div className="space-y-3">
          {/* Y-axis labels */}
          <div className="flex items-end justify-between h-48">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <Skeleton 
                  className="w-8 rounded-t" 
                  style={{ height: `${Math.random() * 120 + 30}px` }}
                />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex justify-center space-x-6 pt-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}