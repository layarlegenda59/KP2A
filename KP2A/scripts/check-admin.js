// Script to check admin user
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
    storageKey: `supabase-script-check-${process.pid || Math.random()}`
  }
})

async function checkAdmin() {
  try {
    console.log('Checking admin users...')
    
    // Check if there are any users in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log(`Found ${authUsers.users.length} auth users`)
      authUsers.users.forEach(user => {
        console.log(`- ${user.email} (${user.id})`)
      })
    }
    
    // Check users table for admin
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
    
    if (usersError) {
      console.error('Error fetching admin users:', usersError)
    } else {
      console.log(`Found ${users.length} admin users`)
      users.forEach(user => {
        console.log(`- ${user.email} - Role: ${user.role}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkAdmin()
  .then(() => {
    console.log('Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Check failed:', error)
    process.exit(1)
  })