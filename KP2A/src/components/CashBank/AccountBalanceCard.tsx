import React from 'react'
import { FaWallet, FaUniversity } from 'react-icons/fa'
import { Account } from '../../types/cashbank'
import { formatCurrency } from '../../utils/numberFormat'
import { AnimatedCard, AnimatedIcon } from '../UI/AnimatedComponents'

interface AccountBalanceCardProps {
  account: Account
}

export function AccountBalanceCard({ account }: AccountBalanceCardProps) {
  const Icon = account.type === 'cash' ? FaWallet : FaUniversity
  
  const colorClasses = {
    cash: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-800',
    bank: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-800',
  }

  return (
    <AnimatedCard
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-all duration-200"
      hoverScale={1.02}
      hoverY={-2}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {account.name}
            </h3>
            {account.type === 'bank' && account.bank_name && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                {account.bank_name}
              </span>
            )}
          </div>
          
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {formatCurrency(account.balance)}
          </p>
          
          {account.type === 'bank' && account.account_number && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No. Rekening: {account.account_number}
            </p>
          )}
          
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {account.type === 'cash' ? 'Kas Tunai' : 'Rekening Bank'}
          </p>
        </div>
        
        <AnimatedIcon className={`p-3 rounded-full ring-4 ${colorClasses[account.type]}`}>
          <Icon className="h-6 w-6" />
        </AnimatedIcon>
      </div>
    </AnimatedCard>
  )
}