// Script to debug frontend calculation logic
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

async function debugFrontendCalculation() {
  try {
    console.log('🔍 Debugging frontend calculation logic...')
    
    // Simulate frontend data fetching
    console.log('\n1. Fetching all dues data (like frontend)...')
    const allDuesRes = await supabase
      .from('dues')
      .select('id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status, created_at, updated_at, member:members!left(id, nama_lengkap)')
      .order('created_at', { ascending: false })
    
    if (allDuesRes.error) {
      console.error('Error fetching dues:', allDuesRes.error)
      throw allDuesRes.error
    }
    
    console.log(`✅ Fetched ${allDuesRes.data.length} total dues records`)
    
    // Normalize data like frontend
    const allNormalized = allDuesRes.data.map((d) => ({
      ...d,
      iuran_wajib: Number(d.iuran_wajib),
      iuran_sukarela: Number(d.iuran_sukarela),
      simpanan_wajib: Number(d.simpanan_wajib || 0),
    }))
    
    console.log('\n2. Sample normalized data:')
    console.log(allNormalized.slice(0, 3).map(d => ({
      id: d.id,
      member_id: d.member_id,
      bulan: d.bulan,
      tahun: d.tahun,
      iuran_wajib: d.iuran_wajib,
      simpanan_wajib: d.simpanan_wajib,
      member_name: d.member?.nama_lengkap
    })))
    
    // Test different filter scenarios
    const filterScenarios = [
      { name: 'All data', search: '', status: 'all', month: 'all', year: 'all' },
      { name: 'Year 2024 only', search: '', status: 'all', month: 'all', year: 2024 },
      { name: 'Year 2024 + Month 1', search: '', status: 'all', month: 1, year: 2024 },
      { name: 'Year 2024 + Status lunas', search: '', status: 'lunas', month: 'all', year: 2024 }
    ]
    
    filterScenarios.forEach(scenario => {
      console.log(`\n3. Testing filter scenario: ${scenario.name}`)
      console.log(`   Filters: search="${scenario.search}", status="${scenario.status}", month="${scenario.month}", year="${scenario.year}"`)
      
      // Apply frontend filtering logic
      const q = scenario.search.trim().toLowerCase()
      const filtered = allNormalized.filter((d) => {
        const matchStatus = scenario.status === 'all' ? true : d.status === scenario.status
        const matchMonth = scenario.month === 'all' ? true : d.bulan === scenario.month
        const matchYear = scenario.year === 'all' ? true : d.tahun === scenario.year
        const matchSearch = q ? (d.member?.nama_lengkap || '').toLowerCase().includes(q) : true
        return matchStatus && matchMonth && matchYear && matchSearch
      })
      
      console.log(`   📊 Filtered records: ${filtered.length}`)
      
      if (filtered.length > 0) {
        // Calculate totals like frontend
        const totalAll = filtered.reduce(
          (acc, due) => {
            const iuranWajib = parseFloat(due.iuran_wajib) || 0
            const iuranSukarela = parseFloat(due.iuran_sukarela) || 0
            const simpananWajib = parseFloat(due.simpanan_wajib) || 0

            acc.iuran_wajib += iuranWajib
            acc.iuran_sukarela += iuranSukarela
            acc.simpanan_wajib += simpananWajib
            acc.total += iuranWajib + iuranSukarela + simpananWajib

            return acc
          },
          { iuran_wajib: 0, iuran_sukarela: 0, simpanan_wajib: 0, total: 0 }
        )
        
        console.log(`   💰 Calculated totals:`)
        console.log(`      - Iuran Wajib: ${totalAll.iuran_wajib.toLocaleString()}`)
        console.log(`      - Iuran Sukarela: ${totalAll.iuran_sukarela.toLocaleString()}`)
        console.log(`      - Simpanan Wajib: ${totalAll.simpanan_wajib.toLocaleString()}`)
        console.log(`      - Grand Total: ${totalAll.total.toLocaleString()}`)
        
        // Check if matches target for 2024
        if (scenario.year === 2024) {
          console.log(`   🎯 Target comparison for 2024:`)
          console.log(`      - Iuran Wajib: ${totalAll.iuran_wajib === 18850000 ? '✅' : '❌'} (Target: 18,850,000)`)
          console.log(`      - Simpanan Wajib: ${totalAll.simpanan_wajib === 34100000 ? '✅' : '❌'} (Target: 34,100,000)`)
        }
        
        // Show sample records
        console.log(`   📋 Sample filtered records:`)
        filtered.slice(0, 3).forEach((record, index) => {
          console.log(`      ${index + 1}. Member: ${record.member?.nama_lengkap || 'Unknown'}, Month: ${record.bulan}, Year: ${record.tahun}`)
          console.log(`         Iuran Wajib: ${record.iuran_wajib.toLocaleString()}, Simpanan Wajib: ${record.simpanan_wajib.toLocaleString()}`)
        })
      } else {
        console.log(`   ⚠️  No records match this filter`)
      }
    })
    
    // Check for potential data type issues
    console.log('\n4. Checking for data type issues...')
    const year2024Data = allNormalized.filter(d => d.tahun === 2024)
    console.log(`   📊 Year 2024 records: ${year2024Data.length}`)
    
    if (year2024Data.length > 0) {
      const sampleRecord = year2024Data[0]
      console.log(`   🔍 Sample record data types:`)
      console.log(`      - tahun: ${typeof sampleRecord.tahun} (${sampleRecord.tahun})`)
      console.log(`      - bulan: ${typeof sampleRecord.bulan} (${sampleRecord.bulan})`)
      console.log(`      - iuran_wajib: ${typeof sampleRecord.iuran_wajib} (${sampleRecord.iuran_wajib})`)
      console.log(`      - simpanan_wajib: ${typeof sampleRecord.simpanan_wajib} (${sampleRecord.simpanan_wajib})`)
      console.log(`      - status: ${typeof sampleRecord.status} (${sampleRecord.status})`)
    }
    
    return { allNormalized, year2024Data }
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

debugFrontendCalculation()
  .then(() => {
    console.log('\n✅ Frontend calculation debugging completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Debugging failed:', error)
    process.exit(1)
  })