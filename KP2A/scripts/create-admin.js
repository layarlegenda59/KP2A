// Script to create admin user
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    storageKey: `supabase-script-admin-${process.pid || Math.random()}`
  }
})

async function createAdmin() {
  try {
    console.log('Creating admin user...')
    
    // Check if admin user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@kp2a.com')
    
    if (checkError) {
      console.error('Error checking existing users:', checkError)
      throw checkError
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Admin user already exists:', existingUsers[0])
      return existingUsers[0]
    }
    
    // Create admin user in users table
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: 'admin@kp2a.com',
        role: 'admin'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating admin user:', createError)
      throw createError
    }
    
    console.log('✅ Admin user created successfully:', newUser)
    return newUser
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

createAdmin()
  .then(() => {
    console.log('Admin creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Admin creation failed:', error)
    process.exit(1)
  })