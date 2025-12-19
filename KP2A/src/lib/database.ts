// Database layer - temporary demo mode (MySQL backend in use)
import { supabase, isSupabaseAvailable } from './supabase'

// Get the database client (Supabase only - disabled for MySQL migration)
export const databaseClient = supabase
export const database = databaseClient
// Force demo mode while Supabase is not available (MySQL migration in progress)
export const isDatabaseAvailable = () => false

// Initialize database
export const initializeDatabase = async (): Promise<void> => {
  console.log('🔄 Initializing Supabase database...')
  
  // Initialize Supabase
  const { initializeSupabase } = await import('./supabase')
  return initializeSupabase()
}

// Re-export utilities
export { withTimeout } from './supabase'

// Default export
export default databaseClient