import { supabase } from './supabase'

/**
 * Check admin email status (no admin API needed)
 */
export async function confirmAdminEmail() {
  try {
    console.log('🔧 Checking admin email status...')
    
    const adminEmail = 'admin@kp2acimahi.com'
    const adminPassword = 'admin123'
    
    // Try to sign in to check if user exists and works
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })
    
    if (signInData?.user) {
      console.log('✅ Admin user login successful')
      console.log('📧 Email confirmed:', signInData.user.email_confirmed_at ? 'Yes' : 'No')
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', signInData.user.id)
        .single()
      
      if (!existingProfile) {
        // Create profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: signInData.user.id,
            email: adminEmail,
            role: 'admin'
          })
        
        if (profileError && !profileError.message.includes('duplicate key')) {
          console.error('⚠️ Error creating user profile:', profileError.message)
        } else {
          console.log('✅ Admin user profile created successfully')
        }
      }
      
      await supabase.auth.signOut()
      
      return { 
        success: true, 
        message: 'Admin user is functional',
        user: signInData.user
      }
    }
    
    if (signInError) {
      console.log('❌ Admin login failed:', signInError.message)
      
      if (signInError.message.includes('Invalid login credentials')) {
        return { 
          success: false, 
          error: 'Admin user does not exist or wrong credentials' 
        }
      } else if (signInError.message.includes('Email not confirmed')) {
        console.log('⚠️ Email not confirmed, but this is normal for development')
        return { 
          success: true, 
          message: 'Admin user exists but email not confirmed (normal for development)' 
        }
      }
      
      return { 
        success: false, 
        error: signInError.message 
      }
    }
    
    return { 
      success: false, 
      error: 'Unexpected state' 
    }
    
  } catch (error) {
    console.error('❌ Error checking admin email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Alternative approach: Create admin user using regular signUp (no admin API needed)
 */
export async function createConfirmedAdminUser() {
  try {
    console.log('🔧 Creating/checking admin user...')
    
    const adminEmail = 'admin@kp2acimahi.com'
    const adminPassword = 'admin123'
    
    // First, check if user already exists by trying to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })
    
    if (signInData?.user) {
      console.log('✅ Admin user already exists and can sign in')
      
      // Check if profile exists in users table
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', signInData.user.id)
        .single()
      
      if (profileCheckError && profileCheckError.message.includes('No rows returned')) {
        console.log('🔧 Creating missing user profile...')
        
        // Create profile only if it doesn't exist
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: signInData.user.id,
            email: adminEmail,
            role: 'admin'
          })
        
        if (profileError) {
          if (profileError.message.includes('duplicate key')) {
            console.log('✅ User profile already exists (duplicate key ignored)')
          } else {
            console.error('⚠️ Error creating user profile:', profileError.message)
          }
        } else {
          console.log('✅ Admin user profile created successfully')
        }
      } else if (existingProfile) {
        console.log('✅ User profile already exists')
      }
      
      await supabase.auth.signOut()
      
      return { 
        success: true, 
        message: 'Admin user already exists and profile ensured',
        user: signInData.user
      }
    }
    
    // If sign in failed, check the error
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('🔧 Admin user does not exist, creating new user...')
        
        // Create new user
        const { data, error } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: {
              role: 'admin',
              full_name: 'Administrator'
            }
          }
        })
        
        if (error) {
          if (error.message.includes('already exists') || error.message.includes('already registered')) {
            console.log('✅ User exists in auth but password might be different')
            return { 
              success: false, 
              error: 'Admin user exists but password verification failed. Please check credentials.' 
            }
          }
          
          console.error('❌ Error creating admin user:', error.message)
          return { success: false, error: error.message }
        }
        
        if (!data.user) {
          return { success: false, error: 'No user data returned' }
        }
        
        console.log('✅ Admin user created successfully:', data.user.id)
        
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: adminEmail,
            role: 'admin'
          })
        
        if (profileError) {
          if (profileError.message.includes('duplicate key')) {
            console.log('✅ User profile already exists (duplicate key ignored)')
          } else {
            console.error('⚠️ Error creating user profile:', profileError.message)
          }
        } else {
          console.log('✅ Admin user profile created successfully')
        }
        
        return { 
          success: true, 
          message: 'Admin user created successfully',
          user: data.user
        }
        
      } else if (signInError.message.includes('Email not confirmed')) {
        console.log('⚠️ Admin user exists but email not confirmed')
        return { 
          success: true, 
          message: 'Admin user exists but email not confirmed (normal for development)' 
        }
      } else {
        console.error('❌ Unexpected sign in error:', signInError.message)
        return { success: false, error: signInError.message }
      }
    }
    
    return { success: false, error: 'Unexpected state' }
    
  } catch (error) {
    console.error('❌ Error creating confirmed admin user:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Add to window for easy testing
declare global {
  interface Window {
    confirmAdminEmail: () => Promise<any>
    createConfirmedAdminUser: () => Promise<any>
  }
}

export function addEmailConfirmToWindow() {
  if (typeof window !== 'undefined') {
    window.confirmAdminEmail = confirmAdminEmail
    window.createConfirmedAdminUser = createConfirmedAdminUser
    console.log('🔧 Email confirmation functions added to window:')
    console.log('- window.confirmAdminEmail()')
    console.log('- window.createConfirmedAdminUser()')
  }
}