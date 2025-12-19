// Script to confirm admin email manually
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function confirmAdminEmail() {
  try {
    console.log('Confirming admin email...')
    
    // First, get the admin user
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('Error getting users:', getUserError)
      throw getUserError
    }
    
    const adminUser = users.users.find(user => user.email === 'admin@kp2a.com')
    
    if (!adminUser) {
      console.error('Admin user not found')
      throw new Error('Admin user not found')
    }
    
    console.log('Found admin user:', adminUser.id)
    console.log('Current email confirmed:', adminUser.email_confirmed_at)
    
    if (adminUser.email_confirmed_at) {
      console.log('✅ Email already confirmed')
      return adminUser
    }
    
    // Confirm the email
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { 
        email_confirm: true,
        user_metadata: { 
          ...adminUser.user_metadata,
          email_verified: true 
        }
      }
    )
    
    if (error) {
      console.error('Error confirming email:', error)
      throw error
    }
    
    console.log('✅ Admin email confirmed successfully!')
    console.log('Updated user:', data.user.email_confirmed_at)
    
    return data.user
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

confirmAdminEmail()
  .then(() => {
    console.log('\n🎉 Admin email confirmation completed successfully')
    console.log('You can now login with admin@kp2a.com / admin123')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Email confirmation failed:', error)
    process.exit(1)
  })