import { sqliteManager } from './sqlite'

/**
 * Database Migration Manager for SQLite
 * Handles creation and updates of database schema
 */

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: async () => {
      const statements = [
        // Users table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              full_name TEXT NOT NULL,
              phone TEXT,
              address TEXT,
              role TEXT CHECK(role IN ('admin', 'pengurus', 'anggota')) NOT NULL DEFAULT 'anggota',
              is_active BOOLEAN NOT NULL DEFAULT 1,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `
        },
        
        // Members table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS members (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              member_number TEXT UNIQUE NOT NULL,
              full_name TEXT NOT NULL,
              email TEXT,
              phone TEXT,
              address TEXT,
              join_date DATE NOT NULL,
              is_active BOOLEAN NOT NULL DEFAULT 1,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `
        },
        
        // Loans table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS loans (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              member_id INTEGER NOT NULL,
              loan_number TEXT UNIQUE NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              interest_rate DECIMAL(5,2) NOT NULL,
              term_months INTEGER NOT NULL,
              monthly_payment DECIMAL(15,2) NOT NULL,
              start_date DATE NOT NULL,
              end_date DATE NOT NULL,
              status TEXT CHECK(status IN ('active', 'completed', 'defaulted')) NOT NULL DEFAULT 'active',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
            )
          `
        },
        
        // Loan Payments table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS loan_payments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              loan_id INTEGER NOT NULL,
              payment_date DATE NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              principal_amount DECIMAL(15,2) NOT NULL,
              interest_amount DECIMAL(15,2) NOT NULL,
              remaining_balance DECIMAL(15,2) NOT NULL,
              payment_method TEXT NOT NULL,
              notes TEXT,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
            )
          `
        },
        
        // Expenses table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category TEXT NOT NULL,
              description TEXT NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              expense_date DATE NOT NULL,
              receipt_url TEXT,
              created_by INTEGER NOT NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
          `
        },
        
        // Dues table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS dues (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              member_id INTEGER NOT NULL,
              due_type TEXT NOT NULL,
              amount DECIMAL(15,2) NOT NULL,
              due_date DATE NOT NULL,
              paid_date DATE,
              status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) NOT NULL DEFAULT 'pending',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
            )
          `
        },
        
        // Reports table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS reports (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              type TEXT NOT NULL,
              content TEXT NOT NULL,
              generated_by INTEGER NOT NULL,
              generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              file_url TEXT,
              FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
            )
          `
        },
        
        // Financial Reports table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS financial_reports (
              id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
              periode_start DATE NOT NULL,
              periode_end DATE NOT NULL,
              tipe_laporan TEXT CHECK (tipe_laporan IN ('bulanan', 'triwulan', 'tahunan')) NOT NULL,
              total_pemasukan DECIMAL(15,2) NOT NULL DEFAULT 0,
              total_pengeluaran DECIMAL(15,2) NOT NULL DEFAULT 0,
              saldo_akhir DECIMAL(15,2) NOT NULL DEFAULT 0,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `
        }
        
        // Sessions table
        {
          sql: `
            CREATE TABLE IF NOT EXISTS sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token TEXT UNIQUE NOT NULL,
              expires_at DATETIME NOT NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `
        }
      ]
      
      await sqliteManager.transaction(statements)
    }
  },
  
  {
    version: 2,
    name: 'create_indexes',
    up: async () => {
      const statements = [
        // Indexes for better performance
        { sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_members_number ON members(member_number)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON loan_payments(payment_date)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_dues_member ON dues(member_id)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_dues_status ON dues(status)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_dues_date ON dues(due_date)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)' },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)' }
      ]
      
      await sqliteManager.transaction(statements)
    }
  },
  
  {
    version: 3,
    name: 'create_triggers',
    up: async () => {
      const statements = [
        // Trigger to update updated_at timestamp for users
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
            AFTER UPDATE ON users
            BEGIN
              UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
          `
        },
        
        // Trigger to update updated_at timestamp for members
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_members_timestamp 
            AFTER UPDATE ON members
            BEGIN
              UPDATE members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
          `
        },
        
        // Trigger to update updated_at timestamp for loans
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_loans_timestamp 
            AFTER UPDATE ON loans
            BEGIN
              UPDATE loans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
          `
        },
        
        // Trigger to update updated_at timestamp for expenses
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_expenses_timestamp 
            AFTER UPDATE ON expenses
            BEGIN
              UPDATE expenses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
          `
        },
        
        // Trigger to update updated_at timestamp for dues
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_dues_timestamp 
            AFTER UPDATE ON dues
            BEGIN
              UPDATE dues SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
          `
        },
        
        // Trigger to automatically set due status to overdue
        {
          sql: `
            CREATE TRIGGER IF NOT EXISTS update_overdue_dues 
            AFTER UPDATE ON dues
            WHEN NEW.due_date < date('now') AND NEW.status = 'pending'
            BEGIN
              UPDATE dues SET status = 'overdue' WHERE id = NEW.id;
            END
          `
        }
      ]
      
      await sqliteManager.transaction(statements)
    }
  }
]

/**
 * Migration version tracking table
 */
const createMigrationTable = async () => {
  await sqliteManager.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

/**
 * Get current migration version
 */
const getCurrentVersion = async (): Promise<number> => {
  try {
    const result = await sqliteManager.get(
      'SELECT MAX(version) as version FROM migrations'
    )
    return result?.version || 0
  } catch (error) {
    return 0
  }
}

/**
 * Record migration execution
 */
const recordMigration = async (version: number, name: string) => {
  await sqliteManager.run(
    'INSERT INTO migrations (version, name) VALUES (?, ?)',
    [version, name]
  )
}

/**
 * Run all pending migrations
 */
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('Starting database migrations...')
    
    // Ensure database is initialized
    await sqliteManager.initialize()
    
    // Create migration tracking table
    await createMigrationTable()
    
    // Get current version
    const currentVersion = await getCurrentVersion()
    console.log(`Current database version: ${currentVersion}`)
    
    // Run pending migrations
    const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion)
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.')
      return
    }
    
    console.log(`Running ${pendingMigrations.length} pending migrations...`)
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.name}`)
      
      try {
        await migration.up()
        await recordMigration(migration.version, migration.name)
        console.log(`✓ Migration ${migration.version} completed successfully`)
      } catch (error) {
        console.error(`✗ Migration ${migration.version} failed:`, error)
        throw error
      }
    }
    
    console.log('All migrations completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

/**
 * Initialize database with sample data
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Seeding database with initial data...')
    
    // Check if admin user already exists
    const existingAdmin = await sqliteManager.get(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    )
    
    if (existingAdmin) {
      console.log('Admin user already exists, skipping seed.')
      return
    }
    
    // Import password hashing function
    const { hashPassword } = await import('./sqlite')
    
    // Create default admin user
    const adminPasswordHash = await hashPassword('admin123')
    
    await sqliteManager.run(`
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'admin@kp2a.com',
      adminPasswordHash,
      'Administrator',
      'admin',
      true
    ])
    
    console.log('✓ Default admin user created (email: admin@kp2a.com, password: admin123)')
    console.log('Database seeding completed!')
    
  } catch (error) {
    console.error('Database seeding failed:', error)
    throw error
  }
}

/**
 * Initialize complete database setup
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    await runMigrations()
    await seedDatabase()
    console.log('Database initialization completed successfully!')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

export default {
  runMigrations,
  seedDatabase,
  initializeDatabase
}