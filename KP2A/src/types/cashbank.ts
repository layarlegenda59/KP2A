export interface Account {
  id: string
  name: string
  type: 'cash' | 'bank'
  balance: number
  bank_name?: string
  account_number?: string
  created_at: string
  updated_at: string
}

export interface CashBankTransaction {
  id: string
  from_account_id: string
  to_account_id: string
  amount: number
  description: string
  transaction_date: string
  status: 'completed' | 'pending' | 'cancelled'
  created_by: string
  created_at: string
  updated_at: string
  from_account?: Account
  to_account?: Account
}

export interface TransferFormData {
  from_account_id: string
  to_account_id: string
  amount: number
  description: string
  transaction_date: string
}