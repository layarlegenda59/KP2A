import React from 'react'
import { DivideIcon as LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-200',
  green: 'bg-green-50 text-green-600 ring-green-200',
  yellow: 'bg-yellow-50 text-yellow-600 ring-yellow-200',
  red: 'bg-red-50 text-red-600 ring-red-200',
}

export function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ring-4 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  )
}