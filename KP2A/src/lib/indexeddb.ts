import Dexie, { Table } from 'dexie'
import bcrypt from 'bcryptjs'

// Define database schema interfaces
export interface User {
  id?: number
  email: string
  password_hash: string
  full_name: string
  phone?: string
  address?: string
  role: 'admin' | 'pengurus' | 'anggota'
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Member {
  id?: number
  member_number: string
  full_name: string
  email?: string
  phone?: string
  address?: string
  join_date: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Loan {
  id?: number
  member_id: number
  loan_number: string
  amount: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  start_date: Date
  end_date: Date
  status: 'active' | 'completed' | 'defaulted'
  created_at: Date
  updated_at: Date
}

export interface LoanPayment {
  id?: number
  loan_id: number
  payment_date: Date
  amount: number
  principal_amount: number
  interest_amount: number
  remaining_balance: number
  payment_method: string
  notes?: string
  created_at: Date
}

export interface Expense {
  id?: number
  category: string
  description: string
  amount: number
  expense_date: Date
  receipt_url?: string
  created_by: number
  created_at: Date
  updated_at: Date
}

export interface Due {
  id?: number
  member_id: number
  due_type: string
  amount: number
  due_date: Date
  paid_date?: Date
  status: 'pending' | 'paid' | 'overdue'
  created_at: Date
  updated_at: Date
}

export interface Report {
  id?: number
  title: string
  type: string
  content: string
  generated_by: number
  generated_at: Date
  file_url?: string
}

export interface Session {
  id?: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
}

export interface FinancialReport {
  id?: string
  periode_start: Date
  periode_end: Date
  tipe_laporan: 'bulanan' | 'triwulan' | 'tahunan'
  total_pemasukan: number
  total_pengeluaran: number
  saldo_akhir: number
  created_at: Date
  updated_at: Date
}

// Define the database
class KP2ADatabase extends Dexie {
  users!: Table<User>
  members!: Table<Member>
  loans!: Table<Loan>
  loan_payments!: Table<LoanPayment>
  expenses!: Table<Expense>
  dues!: Table<Due>
  reports!: Table<Report>
  sessions!: Table<Session>
  financial_reports!: Table<FinancialReport>

  constructor() {
    super('KP2ADatabase')
    
    this.version(1).stores({
      users: '++id, email, role, is_active, created_at',
      members: '++id, member_number, full_name, email, is_active, join_date, created_at',
      loans: '++id, member_id, loan_number, amount, status, start_date, end_date, created_at',
      loan_payments: '++id, loan_id, payment_date, amount, created_at',
      expenses: '++id, category, expense_date, amount, created_by, created_at',
      dues: '++id, member_id, due_type, due_date, status, created_at',
      reports: '++id, type, generated_by, generated_at',
      sessions: '++id, user_id, token, expires_at, created_at'
    })
    
    this.version(2).stores({
      users: '++id, email, role, is_active, created_at',
      members: '++id, member_number, full_name, email, is_active, join_date, created_at',
      loans: '++id, member_id, loan_number, amount, status, start_date, end_date, created_at',
      loan_payments: '++id, loan_id, payment_date, amount, created_at',
      expenses: '++id, category, expense_date, amount, created_by, created_at',
      dues: '++id, member_id, due_type, due_date, status, created_at',
      reports: '++id, type, generated_by, generated_at',
      sessions: '++id, user_id, token, expires_at, created_at',
      financial_reports: 'id, periode_start, periode_end, tipe_laporan, created_at'
    })
  }
}

// Create database instance
export const db = new KP2ADatabase()

/**
 * Initialize database with default data
 */
export const initializeIndexedDB = async (): Promise<void> => {
  try {
    await db.open()
    
    // Check if admin user exists
    const adminExists = await db.users.where('role').equals('admin').first()
    
    if (!adminExists) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      await db.users.add({
        email: 'admin@kp2a-cimahi.com',
        password_hash: hashedPassword,
        full_name: 'Administrator',
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      
      console.log('✅ Default admin user created')
    }
    
    // Check if financial reports exist
    const reportsExist = await db.financial_reports.count()
    
    if (reportsExist === 0) {
      // Create sample financial reports
      const currentDate = new Date()
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      
      await db.financial_reports.bulkAdd([
        {
          id: 'report-' + Date.now() + '-1',
          periode_start: lastMonth,
          periode_end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 0),
          tipe_laporan: 'bulanan',
          total_pemasukan: 15000000,
          total_pengeluaran: 8500000,
          saldo_akhir: 6500000,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'report-' + Date.now() + '-2',
          periode_start: thisMonth,
          periode_end: currentDate,
          tipe_laporan: 'bulanan',
          total_pemasukan: 12000000,
          total_pengeluaran: 7200000,
          saldo_akhir: 4800000,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      
      console.log('✅ Sample financial reports created')
    }
    
    console.log('✅ IndexedDB database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize IndexedDB database:', error)
    throw error
  }
}

/**
 * Check if database is available
 */
export const isIndexedDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

/**
 * Hash password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10)
}

/**
 * Verify password
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

/**
 * Generate session token
 */
export const generateSessionToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Get database stats
 */
export const getDatabaseStats = async (): Promise<any> => {
  try {
    const stats = {
      users: await db.users.count(),
      members: await db.members.count(),
      loans: await db.loans.count(),
      loan_payments: await db.loan_payments.count(),
      expenses: await db.expenses.count(),
      dues: await db.dues.count(),
      reports: await db.reports.count(),
      sessions: await db.sessions.count()
    }
    return stats
  } catch (error) {
    console.error('Error getting database stats:', error)
    return null
  }
}

/**
 * Export database data
 */
export const exportDatabase = async (): Promise<any> => {
  try {
    const data = {
      users: await db.users.toArray(),
      members: await db.members.toArray(),
      loans: await db.loans.toArray(),
      loan_payments: await db.loan_payments.toArray(),
      expenses: await db.expenses.toArray(),
      dues: await db.dues.toArray(),
      reports: await db.reports.toArray()
    }
    return data
  } catch (error) {
    console.error('Error exporting database:', error)
    throw error
  }
}

/**
 * Import database data
 */
export const importDatabase = async (data: any): Promise<void> => {
  try {
    await db.transaction('rw', db.users, db.members, db.loans, db.loan_payments, db.expenses, db.dues, db.reports, async () => {
      // Clear existing data
      await db.users.clear()
      await db.members.clear()
      await db.loans.clear()
      await db.loan_payments.clear()
      await db.expenses.clear()
      await db.dues.clear()
      await db.reports.clear()
      
      // Import new data
      if (data.users) await db.users.bulkAdd(data.users)
      if (data.members) await db.members.bulkAdd(data.members)
      if (data.loans) await db.loans.bulkAdd(data.loans)
      if (data.loan_payments) await db.loan_payments.bulkAdd(data.loan_payments)
      if (data.expenses) await db.expenses.bulkAdd(data.expenses)
      if (data.dues) await db.dues.bulkAdd(data.dues)
      if (data.reports) await db.reports.bulkAdd(data.reports)
    })
    
    console.log('✅ Database imported successfully')
  } catch (error) {
    console.error('❌ Error importing database:', error)
    throw error
  }
}

export default {
  db,
  initializeIndexedDB,
  isIndexedDBAvailable,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  getDatabaseStats,
  exportDatabase,
  importDatabase
}