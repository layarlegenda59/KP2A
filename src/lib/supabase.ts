import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Validates if the provided Supabase credentials are valid
 * @param url - Supabase project URL
 * @param key - Supabase anon/public API key
 * @returns boolean indicating if credentials are valid
 */
const validateSupabaseCredentials = (url: string, key: string): boolean => {
  // Check if URL is provided and has correct format
  if (!url || !url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.warn('Invalid Supabase URL format')
    return false
  }
  
  // Check if API key is provided and has reasonable length
  if (!key || key.length < 20 || key === 'your_anon_key_here') {
    console.warn('Invalid or missing Supabase API key')
    return false
  }
  
  return true
}

// Validate credentials before creating client
const hasValidCredentials = validateSupabaseCredentials(supabaseUrl, supabaseAnonKey)

// Create Supabase client only if credentials are valid
export const supabase: SupabaseClient | null = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null

/**
 * Helper function to check if Supabase is available and properly configured
 * @returns boolean indicating if Supabase client is available
 */
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null
}

/**
 * Test the Supabase connection
 * @returns Promise<boolean> indicating if connection is successful
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase client not initialized - check your environment variables')
    return false
  }

  try {
    // Test connection by checking auth status
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Supabase connection test failed:', error.message)
      return false
    }

    console.log('✅ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

/**
 * Test database access by querying a simple table
 * @returns Promise<boolean> indicating if database query is successful
 */
export const testDatabaseAccess = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase client not available')
    return false
  }

  try {
    // Test database access by querying members table
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Database access test failed:', error.message)
      return false
    }

    console.log('✅ Database access successful!')
    return true
  } catch (error) {
    console.error('❌ Database access failed:', error)
    return false
  }
}

/**
 * Initialize and test Supabase connection
 * Call this function when your app starts to verify everything is working
 */
export const initializeSupabase = async (): Promise<void> => {
  console.log('🔄 Initializing Supabase connection...')
  
  if (!isSupabaseAvailable()) {
    console.warn('⚠️  Supabase not configured - running in demo mode')
    console.log('To connect to Supabase:')
    console.log('1. Get your anon key from https://pudchoeqhzawgsqkdqeg.supabase.co/project/settings/api')
    console.log('2. Update VITE_SUPABASE_ANON_KEY in your .env file')
    return
  }

  // Test connection
  const connectionSuccess = await testSupabaseConnection()
  if (!connectionSuccess) {
    return
  }

  // Test database access
  const databaseSuccess = await testDatabaseAccess()
  if (!databaseSuccess) {
    console.warn('⚠️  Database tables may not be set up yet')
    console.log('Run the database migrations to create required tables')
  }
}

// Mock client for demo mode when Supabase is not available
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Demo mode - use admin@kp2acimahi.com / admin123') }),
    signUp: () => Promise.resolve({ data: { user: null }, error: new Error('Demo mode - signup not available') }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ 
      eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Demo mode') }) }),
      gte: () => ({ lt: () => Promise.resolve({ data: [], error: new Error('Demo mode') }) }),
      order: () => ({ limit: () => Promise.resolve({ data: [], error: new Error('Demo mode') }) }),
      limit: () => Promise.resolve({ data: [], error: new Error('Demo mode') })
    }),
    insert: () => Promise.resolve({ data: null, error: new Error('Demo mode') }),
    update: () => Promise.resolve({ data: null, error: new Error('Demo mode') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Demo mode') })
  })
})

// Export the client (will be null if not configured)
export default supabase