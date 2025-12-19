import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function debugDuesCalculation2024() {
  try {
    console.log('🔍 [Debug] Fetching dues data for 2024...')
    
    // Fetch all dues data
    const { data: dues, error } = await supabase
      .from('dues')
      .select(`
        *,
        member:members(nama_lengkap)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching dues:', error)
      return
    }

    console.log(`📊 [Debug] Total dues records: ${dues.length}`)
    
    // Filter for year 2024
    const filtered2024 = dues.filter(d => d.tahun === 2024)
    console.log(`📊 [Debug] Records for year 2024: ${filtered2024.length}`)
    
    // Show sample records
    console.log('🎯 [Debug] Sample 2024 records:')
    filtered2024.slice(0, 5).forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, Tahun: ${record.tahun}, Bulan: ${record.bulan}`)
      console.log(`     Iuran Wajib: ${record.iuran_wajib}, Simpanan Wajib: ${record.simpanan_wajib}`)
      console.log(`     Status: ${record.status}, Member: ${record.member?.nama_lengkap}`)
    })
    
    // Calculate totals for 2024
    const totals = filtered2024.reduce(
      (acc, due, index) => {
        const iuranWajib = parseFloat(due.iuran_wajib?.toString() || '0')
        const iuranSukarela = parseFloat(due.iuran_sukarela?.toString() || '0')
        const simpananWajib = parseFloat(due.simpanan_wajib?.toString() || '0')

        acc.iuran_wajib += iuranWajib
        acc.iuran_sukarela += iuranSukarela
        acc.simpanan_wajib += simpananWajib
        
        // Debug first 5 records
        if (index < 5) {
          console.log(`💰 [Debug] Record ${index + 1} calculation:`)
          console.log(`  Iuran Wajib: ${iuranWajib} (running total: ${acc.iuran_wajib})`)
          console.log(`  Simpanan Wajib: ${simpananWajib} (running total: ${acc.simpanan_wajib})`)
        }

        return acc
      },
      { iuran_wajib: 0, iuran_sukarela: 0, simpanan_wajib: 0 }
    )
    
    console.log('\n💰 [Debug] Final Calculation Results for 2024:')
    console.log(`Records processed: ${filtered2024.length}`)
    console.log(`Iuran Wajib: ${totals.iuran_wajib} (formatted: ${totals.iuran_wajib.toLocaleString('id-ID')})`)
    console.log(`Iuran Sukarela: ${totals.iuran_sukarela} (formatted: ${totals.iuran_sukarela.toLocaleString('id-ID')})`)
    console.log(`Simpanan Wajib: ${totals.simpanan_wajib} (formatted: ${totals.simpanan_wajib.toLocaleString('id-ID')})`)
    
    console.log('\n🎯 [Debug] Validation against expected values:')
    console.log(`Expected Iuran Wajib: 18,850,000`)
    console.log(`Actual Iuran Wajib: ${totals.iuran_wajib.toLocaleString('id-ID')}`)
    console.log(`Match: ${totals.iuran_wajib === 18850000 ? '✅' : '❌'}`)
    
    console.log(`Expected Simpanan Wajib: 34,100,000`)
    console.log(`Actual Simpanan Wajib: ${totals.simpanan_wajib.toLocaleString('id-ID')}`)
    console.log(`Match: ${totals.simpanan_wajib === 34100000 ? '✅' : '❌'}`)
    
    // Check for any filtering issues
    console.log('\n🔍 [Debug] Checking for potential filtering issues:')
    
    // Check different status values
    const statusCounts = {}
    filtered2024.forEach(d => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
    })
    console.log('Status distribution:', statusCounts)
    
    // Check different month values
    const monthCounts = {}
    filtered2024.forEach(d => {
      monthCounts[d.bulan] = (monthCounts[d.bulan] || 0) + 1
    })
    console.log('Month distribution:', monthCounts)
    
    // Check for null/undefined values
    const nullChecks = {
      iuran_wajib_null: filtered2024.filter(d => !d.iuran_wajib).length,
      simpanan_wajib_null: filtered2024.filter(d => !d.simpanan_wajib).length,
      status_null: filtered2024.filter(d => !d.status).length
    }
    console.log('Null value counts:', nullChecks)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugDuesCalculation2024()