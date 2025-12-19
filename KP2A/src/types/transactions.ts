export interface TransactionCategory {
  id: string
  name: string
  type: 'income' | 'expense'
  color_code?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'e_wallet' | 'other'
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  transaction_type: 'income' | 'expense'
  amount: number
  transaction_date: string
  category_id: string
  description?: string
  payment_method_id: string
  created_by: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // Joined data
  category?: TransactionCategory
  payment_method?: PaymentMethod
  created_by_user?: {
    id: string
    email: string
  }
}

export interface TransactionFormValues {
  transaction_type: 'income' | 'expense'
  amount: number
  transaction_date: string
  category_id: string
  description: string
  payment_method_id: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface TransactionSummary {
  total_income: number
  total_expense: number
  net_amount: number
  transaction_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
}

export interface MonthlyTransactionData {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategorySummary {
  category_name: string
  category_type: 'income' | 'expense'
  total_amount: number
  transaction_count: number
  color_code?: string
}