// Script to login as admin for testing
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function loginAdmin() {
  try {
    console.log('Attempting to login as admin...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@kp2a.com',
      password: 'admin123'
    })
    
    if (error) {
      console.error('Login failed:', error.message)
      throw error
    }
    
    console.log('✅ Login successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Session token:', data.session?.access_token?.substring(0, 20) + '...')
    
    return data
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

loginAdmin()
  .then(() => {
    console.log('\n🎉 Admin login completed successfully')
    console.log('You can now access protected routes in the browser')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Login failed:', error)
    process.exit(1)
  })