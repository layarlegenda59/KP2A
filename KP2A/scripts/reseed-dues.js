// Script to reseed dues data with target values
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

async function reseedDuesData() {
  try {
    console.log('Starting dues data reseeding...')
    
    // Clear existing dues data for 2024
    console.log('Clearing existing dues data for 2024...')
    const { error: deleteError } = await supabase
      .from('dues')
      .delete()
      .eq('tahun', 2024) // Delete all 2024 records
    
    if (deleteError) {
      console.error('Error clearing dues data:', deleteError)
      throw deleteError
    }
    
    console.log('Existing dues data cleared successfully')
    
    // Get member IDs for sample dues
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .limit(3)
    
    if (!members || members.length === 0) {
      console.log('No members found for dues seeding')
      return
    }
    
    console.log(`Found ${members.length} members for seeding`)
    
    // Create comprehensive sample data for 2024 to match target values
    const sampleDues = []
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    
    members.forEach((member, memberIndex) => {
      months.forEach((month) => {
        // Distribute values to reach exact targets
        let iuranWajib = 0
        let simpananWajib = 0
        
        if (memberIndex === 0) {
          // Member 1: Target 6,283,334 for iuran_wajib, 11,366,667 for simpanan_wajib
          iuranWajib = month <= 6 ? 530000 : 490000  // Total: 6,120,000
          simpananWajib = month <= 6 ? 960000 : 920000  // Total: 11,280,000
        } else if (memberIndex === 1) {
          // Member 2: Target 6,283,333 for iuran_wajib, 11,366,667 for simpanan_wajib
          iuranWajib = month <= 6 ? 525000 : 485000  // Total: 6,060,000
          simpananWajib = month <= 6 ? 955000 : 915000  // Total: 11,220,000
        } else if (memberIndex === 2) {
          // Member 3: Target 6,283,333 for iuran_wajib, 11,366,666 for simpanan_wajib
          iuranWajib = month <= 6 ? 520000 : 480000  // Total: 6,000,000
          simpananWajib = month <= 6 ? 950000 : 910000  // Total: 11,160,000
          
          // Add extra to reach exact target for last member
          if (month === 12) {
            iuranWajib += 670000  // Add to reach 18,850,000 total (6,120,000 + 6,060,000 + 6,670,000)
            simpananWajib += 440000  // Add to reach 34,100,000 total (11,280,000 + 11,220,000 + 11,600,000)
          }
        }
        
        sampleDues.push({
          member_id: member.id,
          bulan: month,
          tahun: 2024,
          iuran_wajib: iuranWajib,
          iuran_sukarela: 25000, // Keep consistent
          simpanan_wajib: simpananWajib,
          tanggal_bayar: `2024-${month.toString().padStart(2, '0')}-15`,
          status: 'lunas'
        })
      })
    })
    
    // Calculate totals for verification
    const totalIuranWajib = sampleDues.reduce((sum, due) => sum + due.iuran_wajib, 0)
    const totalSimpananWajib = sampleDues.reduce((sum, due) => sum + due.simpanan_wajib, 0)
    const totalIuranSukarela = sampleDues.reduce((sum, due) => sum + due.iuran_sukarela, 0)
    
    console.log('Calculated totals before insert:')
    console.log(`Total iuran_wajib: ${totalIuranWajib.toLocaleString()} (target: 18,850,000)`)
    console.log(`Total simpanan_wajib: ${totalSimpananWajib.toLocaleString()} (target: 34,100,000)`)
    console.log(`Total iuran_sukarela: ${totalIuranSukarela.toLocaleString()}`)
    console.log(`Total records to insert: ${sampleDues.length}`)
    
    // Insert new data
    console.log('Inserting new dues data...')
    const { error } = await supabase
      .from('dues')
      .insert(sampleDues)
    
    if (error) {
      console.error('Error seeding dues:', error)
      throw error
    }
    
    console.log('✅ Dues data reseeded successfully!')
    console.log(`✅ Total records created: ${sampleDues.length}`)
    console.log(`✅ Total iuran_wajib: ${totalIuranWajib.toLocaleString()}`)
    console.log(`✅ Total simpanan_wajib: ${totalSimpananWajib.toLocaleString()}`)
    
    return {
      success: true,
      recordsCreated: sampleDues.length,
      totals: {
        iuranWajib: totalIuranWajib,
        simpananWajib: totalSimpananWajib,
        iuranSukarela: totalIuranSukarela
      }
    }
    
  } catch (error) {
    console.error('Error in reseedDuesData:', error)
    throw error
  }
}

// Run the script
reseedDuesData()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })