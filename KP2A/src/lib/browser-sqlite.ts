/**
 * Browser-compatible SQLite implementation using IndexedDB
 * This provides a SQLite-like interface for browser environments
 */

interface User {
  id?: number
  email: string
  password_hash: string
  full_name: string
  phone?: string
  address?: string
  role: 'admin' | 'pengurus' | 'anggota'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Member {
  id?: number
  nama_lengkap: string
  id_anggota: string
  no_hp?: string
  alamat?: string
  status_keanggotaan: 'aktif' | 'tidak_aktif'
  jabatan?: string
  tanggal_masuk: string
  created_at?: string
  updated_at?: string
}

interface Session {
  id?: number
  user_id: number
  token: string
  expires_at: string
  created_at: string
}

class BrowserSQLiteManager {
  private dbName = 'kp2a_database'
  private version = 1
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create users table
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true })
          usersStore.createIndex('email', 'email', { unique: true })
        }
        
        // Create members table
        if (!db.objectStoreNames.contains('members')) {
          const membersStore = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true })
          membersStore.createIndex('id_anggota', 'id_anggota', { unique: true })
        }
        
        // Create sessions table
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true })
          sessionsStore.createIndex('token', 'token', { unique: true })
          sessionsStore.createIndex('user_id', 'user_id')
        }
      }
    })
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Simple SQL parsing for basic SELECT queries
    if (sql.includes('SELECT * FROM users WHERE email = ?')) {
      return this.getUserByEmail(params[0])
    }
    
    if (sql.includes('SELECT * FROM sessions WHERE token = ?')) {
      return this.getSessionByToken(params[0])
    }
    
    return null
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Simple SQL parsing for basic INSERT queries
    if (sql.includes('INSERT INTO users')) {
      return this.insertUser(params)
    }
    
    if (sql.includes('INSERT INTO sessions')) {
      return this.insertSession(params)
    }
    
    if (sql.includes('DELETE FROM sessions WHERE token = ?')) {
      return this.deleteSessionByToken(params[0])
    }
    
    return { changes: 0 }
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly')
      const store = transaction.objectStore('users')
      const index = store.index('email')
      const request = index.get(email)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async getSessionByToken(token: string): Promise<Session | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readonly')
      const store = transaction.objectStore('sessions')
      const index = store.index('token')
      const request = index.get(token)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async insertUser(params: any[]): Promise<{ lastID: number }> {
    return new Promise((resolve, reject) => {
      const [email, password_hash, full_name, role, is_active, phone, address, created_at, updated_at] = params
      
      const user: User = {
        email,
        password_hash,
        full_name,
        role,
        is_active,
        phone: phone || '',
        address: address || '',
        created_at,
        updated_at
      }
      
      const transaction = this.db!.transaction(['users'], 'readwrite')
      const store = transaction.objectStore('users')
      const request = store.add(user)
      
      request.onsuccess = () => resolve({ lastID: request.result as number })
      request.onerror = () => reject(request.error)
    })
  }

  private async insertSession(params: any[]): Promise<{ lastID: number }> {
    return new Promise((resolve, reject) => {
      const [user_id, token, expires_at, created_at] = params
      
      const session: Session = {
        user_id,
        token,
        expires_at,
        created_at
      }
      
      const transaction = this.db!.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')
      const request = store.add(session)
      
      request.onsuccess = () => resolve({ lastID: request.result as number })
      request.onerror = () => reject(request.error)
    })
  }

  private async deleteSessionByToken(token: string): Promise<{ changes: number }> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')
      const index = store.index('token')
      const request = index.getKey(token)
      
      request.onsuccess = () => {
        if (request.result) {
          const deleteRequest = store.delete(request.result)
          deleteRequest.onsuccess = () => resolve({ changes: 1 })
          deleteRequest.onerror = () => reject(deleteRequest.error)
        } else {
          resolve({ changes: 0 })
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const browserSQLiteManager = new BrowserSQLiteManager()
export type { User, Member, Session }