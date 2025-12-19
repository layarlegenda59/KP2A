import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create admin client with service role key for admin operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Missing Supabase URL or Service Role Key for admin operations')
}

// Singleton pattern for admin client to prevent multiple instances
let supabaseAdminInstance: SupabaseClient | null = null

function createSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminInstance) {
    console.log('🔄 Returning existing Supabase admin client instance')
    return supabaseAdminInstance
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('⚠️ Cannot create Supabase admin client - missing credentials')
    return null
  }

  console.log('🆕 Creating new Supabase admin client instance')
  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `supabase-admin-auth-${window.location.hostname || 'localhost'}-admin` // Unique storage key for admin client
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-admin-client'
      }
    }
  })

  return supabaseAdminInstance
}

export const supabaseAdmin = createSupabaseAdminClient()

/**
 * Confirm a user's email using admin privileges
 */
export async function confirmUserEmail(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available')
    return false
  }

  try {
    console.log(`🔧 Confirming email for user: ${userId}`)
    
    // Update the user's email_confirmed_at field
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true
    })

    if (error) {
      console.error('Error confirming user email:', error)
      return false
    }

    console.log('✅ User email confirmed successfully')
    return true
  } catch (error) {
    console.error('Error confirming user email:', error)
    return false
  }
}

/**
 * Reset user password using admin privileges
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available')
    return false
  }

  try {
    console.log(`🔧 Resetting password for user: ${userId}`)
    
    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      console.error('Error resetting user password:', error)
      return false
    }

    console.log('✅ User password reset successfully')
    return true
  } catch (error) {
    console.error('Error resetting user password:', error)
    return false
  }
}

/**
 * Create a confirmed admin user using service role
 */
export async function createConfirmedAdminUser(email: string, password: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  try {
    console.log('🔧 Creating confirmed admin user with service role...')
    
    // Create user with admin client (bypasses email confirmation)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // This confirms the email immediately
      user_metadata: {
        full_name: 'Administrator',
        role: 'admin'
      }
    })

    if (error) {
      console.error('Error creating confirmed admin user:', error)
      throw error
    }

    if (!data.user) {
      throw new Error('Failed to create admin user')
    }

    console.log('✅ Confirmed admin user created successfully:', data.user.id)
    return data.user
  } catch (error) {
    console.error('Error creating confirmed admin user:', error)
    throw error
  }
}

/**
 * Get user by email using admin privileges
 */
export async function getUserByEmail(email: string) {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available')
    return null
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error listing users:', error)
      return null
    }

    const user = data.users.find(u => u.email === email)
    return user || null
  } catch (error) {
    console.error('Error getting user by email:', error)
    return null
  }
}