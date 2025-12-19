// DEPRECATED: Supabase is no longer used. The app now uses MySQL backend.
// This file is kept for compatibility but returns null for all operations.

import { SupabaseClient } from '@supabase/supabase-js'

// Supabase is disabled - using MySQL backend instead
export const supabase: SupabaseClient | null = null

/**
 * Utility to timeout a promise after a specified duration
 */
export function withTimeout<T>(promise: Promise<T>, ms = 4000, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

export const isSupabaseAvailable = (): boolean => {
  return false // Supabase disabled
}

export const testSupabaseConnection = async (): Promise<boolean> => {
  return false // Supabase disabled
}

export const testDatabaseAccess = async (): Promise<boolean> => {
  return false // Supabase disabled
}

export default supabase