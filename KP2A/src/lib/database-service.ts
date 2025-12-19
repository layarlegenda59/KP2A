import { supabase, supabaseOperation } from './supabase'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

/**
 * Database service with built-in retry logic and error handling
 * Wraps all Supabase operations with network error recovery
 */

export class DatabaseService {
  /**
   * Execute a database query with retry logic
   */
  async query<T = any>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string = 'Database query'
  ): Promise<{ data: T | null; error: any }> {
    try {
      return await supabaseOperation(operation, operationName)
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error)
      return { data: null, error: error instanceof Error ? error.message : 'Database operation failed' }
    }
  }

  /**
   * Select data from a table with retry logic
   */
  async select<T = any>(
    table: string,
    columns: string = '*',
    filters?: Record<string, any>
  ): Promise<{ data: T[] | null; error: any }> {
    return this.query(
      async () => {
        let query = supabase.from(table).select(columns)
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }
        
        return await query
      },
      `Select from ${table}`
    )
  }

  /**
   * Insert data into a table with retry logic
   */
  async insert<T = any>(
    table: string,
    data: any | any[]
  ): Promise<{ data: T | null; error: any }> {
    return this.query(
      async () => {
        return await supabase.from(table).insert(data).select()
      },
      `Insert into ${table}`
    )
  }

  /**
   * Update data in a table with retry logic
   */
  async update<T = any>(
    table: string,
    data: any,
    filters: Record<string, any>
  ): Promise<{ data: T | null; error: any }> {
    return this.query(
      async () => {
        let query = supabase.from(table).update(data)
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
        
        return await query.select()
      },
      `Update ${table}`
    )
  }

  /**
   * Delete data from a table with retry logic
   */
  async delete<T = any>(
    table: string,
    filters: Record<string, any>
  ): Promise<{ data: T | null; error: any }> {
    return this.query(
      async () => {
        let query = supabase.from(table).delete()
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
        
        return await query
      },
      `Delete from ${table}`
    )
  }

  /**
   * Execute a custom query with retry logic
   */
  async customQuery<T = any>(
    queryBuilder: () => PostgrestFilterBuilder<any, any, any>,
    operationName: string
  ): Promise<{ data: T | null; error: any }> {
    return this.query(
      async () => {
        const query = queryBuilder()
        return await query
      },
      operationName
    )
  }

  /**
   * Get members with retry logic
   */
  async getMembers(): Promise<{ data: any[] | null; error: any }> {
    return this.select('members', `
      id,
      id_anggota,
      nama_lengkap,
      nik,
      alamat,
      no_hp,
      status_keanggotaan,
      tanggal_masuk,
      jabatan,
      foto,
      created_at,
      updated_at
    `)
  }

  /**
   * Get expenses with retry logic
   */
  async getExpenses(): Promise<{ data: any[] | null; error: any }> {
    return this.select('expenses', `
      id,
      expense_type,
      notes,
      amount,
      payment_date,
      status,
      created_by,
      created_at,
      updated_at
    `)
  }

  /**
   * Get loans with retry logic
   */
  async getLoans(): Promise<{ data: any[] | null; error: any }> {
    return this.customQuery(
      () => supabase
        .from('loans')
        .select(`
          id,
          member_id,
          jumlah_pinjaman,
          bunga_persen,
          tenor_bulan,
          angsuran_bulanan,
          sisa_pinjaman,
          tanggal_pinjaman,
          status,
          created_at,
          updated_at,
          member:members(id, nama_lengkap)
        `),
      'Get loans with member details'
    )
  }

  /**
   * Get dues with retry logic
   */
  async getDues(): Promise<{ data: any[] | null; error: any }> {
    return this.customQuery(
      () => supabase
        .from('dues')
        .select(`
          id,
          member_id,
          bulan,
          tahun,
          iuran_wajib,
          iuran_sukarela,
          simpanan_wajib,
          tanggal_bayar,
          status,
          created_at,
          updated_at,
          member:members(id, nama_lengkap)
        `),
      'Get dues with member details'
    )
  }

  /**
   * Get users with retry logic
   */
  async getUsers(): Promise<{ data: any[] | null; error: any }> {
    return this.select('users', `
      id,
      email,
      full_name,
      phone,
      address,
      role,
      member_id,
      is_active,
      created_at,
      updated_at
    `)
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()

// Export default
export default databaseService