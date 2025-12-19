import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function setBrowserSession() {
  try {
    console.log('🔐 Attempting to sign in as admin...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@kp2a.com',
      password: 'admin123'
    })

    if (error) {
      console.error('❌ Login failed:', error.message)
      return
    }

    console.log('✅ Login successful!')
    console.log('Session token:', data.session?.access_token?.substring(0, 50) + '...')
    
    // Output session info that can be used in browser
    console.log('\n📋 Browser Session Info:')
    console.log('Access Token:', data.session?.access_token)
    console.log('Refresh Token:', data.session?.refresh_token)
    console.log('User ID:', data.user?.id)
    
    console.log('\n🌐 You can now access the /dues page in browser')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

setBrowserSession()