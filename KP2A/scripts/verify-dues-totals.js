// Script to verify dues totals for 2024
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

async function verifyDuesTotals() {
  try {
    console.log('Verifying dues totals for 2024...')
    
    // Get all dues for 2024
    const { data: dues2024, error } = await supabase
      .from('dues')
      .select('*')
      .eq('tahun', 2024)
      .order('bulan', { ascending: true })
    
    if (error) {
      console.error('Error fetching dues:', error)
      throw error
    }
    
    console.log(`Found ${dues2024.length} dues records for 2024`)
    
    // Calculate totals
    const totals = dues2024.reduce((acc, due) => {
      const iuranWajib = parseFloat(due.iuran_wajib) || 0
      const iuranSukarela = parseFloat(due.iuran_sukarela) || 0
      const simpananWajib = parseFloat(due.simpanan_wajib) || 0
      
      acc.iuran_wajib += iuranWajib
      acc.iuran_sukarela += iuranSukarela
      acc.simpanan_wajib += simpananWajib
      acc.total += iuranWajib + iuranSukarela + simpananWajib
      
      return acc
    }, { iuran_wajib: 0, iuran_sukarela: 0, simpanan_wajib: 0, total: 0 })
    
    console.log('\n=== VERIFICATION RESULTS ===')
    console.log(`Total Iuran Wajib: ${totals.iuran_wajib.toLocaleString()}`)
    console.log(`Total Iuran Sukarela: ${totals.iuran_sukarela.toLocaleString()}`)
    console.log(`Total Simpanan Wajib: ${totals.simpanan_wajib.toLocaleString()}`)
    console.log(`Grand Total: ${totals.total.toLocaleString()}`)
    
    console.log('\n=== TARGET COMPARISON ===')
    console.log(`Iuran Wajib - Target: 18,850,000 | Actual: ${totals.iuran_wajib.toLocaleString()} | Match: ${totals.iuran_wajib === 18850000 ? '✅' : '❌'}`)
    console.log(`Simpanan Wajib - Target: 34,100,000 | Actual: ${totals.simpanan_wajib.toLocaleString()} | Match: ${totals.simpanan_wajib === 34100000 ? '✅' : '❌'}`)
    
    // Show breakdown by member
    console.log('\n=== BREAKDOWN BY MEMBER ===')
    const memberTotals = {}
    
    dues2024.forEach(due => {
      if (!memberTotals[due.member_id]) {
        memberTotals[due.member_id] = {
          iuran_wajib: 0,
          simpanan_wajib: 0,
          count: 0
        }
      }
      
      memberTotals[due.member_id].iuran_wajib += parseFloat(due.iuran_wajib) || 0
      memberTotals[due.member_id].simpanan_wajib += parseFloat(due.simpanan_wajib) || 0
      memberTotals[due.member_id].count += 1
    })
    
    Object.entries(memberTotals).forEach(([memberId, totals], index) => {
      console.log(`Member ${index + 1} (${memberId}):`)
      console.log(`  - Records: ${totals.count}`)
      console.log(`  - Iuran Wajib: ${totals.iuran_wajib.toLocaleString()}`)
      console.log(`  - Simpanan Wajib: ${totals.simpanan_wajib.toLocaleString()}`)
    })
    
    // Show sample records
    console.log('\n=== SAMPLE RECORDS ===')
    dues2024.slice(0, 5).forEach((due, index) => {
      console.log(`Record ${index + 1}:`)
      console.log(`  - Member ID: ${due.member_id}`)
      console.log(`  - Month: ${due.bulan}`)
      console.log(`  - Iuran Wajib: ${parseFloat(due.iuran_wajib).toLocaleString()}`)
      console.log(`  - Simpanan Wajib: ${parseFloat(due.simpanan_wajib).toLocaleString()}`)
    })
    
    return totals
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

verifyDuesTotals()
  .then((totals) => {
    console.log('\n✅ Verification completed successfully')
    
    if (totals.iuran_wajib === 18850000 && totals.simpanan_wajib === 34100000) {
      console.log('🎉 All totals match the target values!')
    } else {
      console.log('⚠️  Some totals do not match the target values')
    }
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })