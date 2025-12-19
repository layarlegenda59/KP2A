import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testNumberConversion() {
  try {
    console.log('🔍 Testing number conversion differences...')
    
    // Get raw data from database
    const { data: rawDues, error } = await supabase
      .from('dues')
      .select('id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, simpanan_wajib, tanggal_bayar, status, created_at, updated_at, member:members!left(id, nama_lengkap)')
      .eq('tahun', 2024)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Database error:', error)
      return
    }

    console.log('📊 Raw data count for 2024:', rawDues.length)

    // Test different conversion methods
    console.log('\n🧪 Testing conversion methods on first few records:')
    rawDues.slice(0, 5).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`)
      console.log('- Raw iuran_wajib:', record.iuran_wajib, typeof record.iuran_wajib)
      console.log('- Number():', Number(record.iuran_wajib))
      console.log('- parseFloat():', parseFloat(record.iuran_wajib?.toString() || '0'))
      console.log('- Raw simpanan_wajib:', record.simpanan_wajib, typeof record.simpanan_wajib)
      console.log('- Number():', Number(record.simpanan_wajib || 0))
      console.log('- parseFloat():', parseFloat(record.simpanan_wajib?.toString() || '0'))
    })

    // Calculate totals using Number() (DuesPage method)
    const totalsWithNumber = rawDues.reduce((acc, due) => {
      const iuranWajib = Number(due.iuran_wajib)
      const simpananWajib = Number(due.simpanan_wajib || 0)
      
      acc.iuran_wajib += iuranWajib
      acc.simpanan_wajib += simpananWajib
      
      return acc
    }, { iuran_wajib: 0, simpanan_wajib: 0 })

    // Calculate totals using parseFloat() (Test component method)
    const totalsWithParseFloat = rawDues.reduce((acc, due) => {
      const iuranWajib = parseFloat(due.iuran_wajib?.toString() || '0')
      const simpananWajib = parseFloat(due.simpanan_wajib?.toString() || '0')
      
      acc.iuran_wajib += iuranWajib
      acc.simpanan_wajib += simpananWajib
      
      return acc
    }, { iuran_wajib: 0, simpanan_wajib: 0 })

    console.log('\n💰 Comparison of calculation methods:')
    console.log('Using Number() (DuesPage method):')
    console.log('- Iuran Wajib:', totalsWithNumber.iuran_wajib.toLocaleString('id-ID'))
    console.log('- Simpanan Wajib:', totalsWithNumber.simpanan_wajib.toLocaleString('id-ID'))

    console.log('\nUsing parseFloat() (Test component method):')
    console.log('- Iuran Wajib:', totalsWithParseFloat.iuran_wajib.toLocaleString('id-ID'))
    console.log('- Simpanan Wajib:', totalsWithParseFloat.simpanan_wajib.toLocaleString('id-ID'))

    console.log('\n🔍 Differences:')
    console.log('- Iuran Wajib difference:', (totalsWithNumber.iuran_wajib - totalsWithParseFloat.iuran_wajib).toLocaleString('id-ID'))
    console.log('- Simpanan Wajib difference:', (totalsWithNumber.simpanan_wajib - totalsWithParseFloat.simpanan_wajib).toLocaleString('id-ID'))

    // Check for any null or undefined values
    const nullIuranWajib = rawDues.filter(d => d.iuran_wajib == null)
    const nullSimpananWajib = rawDues.filter(d => d.simpanan_wajib == null)
    
    console.log('\n🔍 Null/undefined values:')
    console.log('- Records with null iuran_wajib:', nullIuranWajib.length)
    console.log('- Records with null simpanan_wajib:', nullSimpananWajib.length)

    if (nullIuranWajib.length > 0) {
      console.log('- Sample null iuran_wajib records:', nullIuranWajib.slice(0, 3).map(r => ({ id: r.id, iuran_wajib: r.iuran_wajib })))
    }
    if (nullSimpananWajib.length > 0) {
      console.log('- Sample null simpanan_wajib records:', nullSimpananWajib.slice(0, 3).map(r => ({ id: r.id, simpanan_wajib: r.simpanan_wajib })))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testNumberConversion()