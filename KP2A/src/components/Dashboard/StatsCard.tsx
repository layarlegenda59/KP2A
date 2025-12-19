import React from 'react'
import { DivideIcon as LucideIcon } from 'react-icons/fa'
import { AnimatedCard, AnimatedIcon } from '../UI/AnimatedComponents'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 ring-yellow-200 dark:ring-yellow-800',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800',
}

export function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  return (
    <AnimatedCard
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-all duration-200"
      hoverScale={1.02}
      hoverY={-2}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${
              trend === 'up' ? 'text-green-600 dark:text-green-400' : 
              trend === 'down' ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-gray-400'
            }`}>
              {change}
            </p>
          )}
        </div>
        <AnimatedIcon className={`p-3 rounded-full ring-4 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </AnimatedIcon>
      </div>
    </AnimatedCard>
  )
}