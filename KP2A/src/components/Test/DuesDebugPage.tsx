import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DueRecord {
  id: string
  tahun: number
  bulan: number
  status: string
  iuran_wajib: number
  simpanan_wajib: number
  member?: {
    nama_lengkap: string
  }
}

export default function DuesDebugPage() {
  const [dues, setDues] = useState<DueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ iuran_wajib: 0, simpanan_wajib: 0 })

  useEffect(() => {
    fetchDues()
  }, [])

  const fetchDues = async () => {
    try {
      console.log('🔍 [DuesDebug] Fetching dues data...')
      
      const { data, error } = await supabase
        .from('dues')
        .select(`
          *,
          member:members(nama_lengkap)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [DuesDebug] Error:', error)
        return
      }

      console.log(`📊 [DuesDebug] Total records: ${data.length}`)
      setDues(data)
      
      // Filter for 2024
      const filtered2024 = data.filter(d => d.tahun === 2024)
      console.log(`📊 [DuesDebug] 2024 records: ${filtered2024.length}`)
      
      // Calculate totals
      const calculated = filtered2024.reduce(
        (acc, due) => {
          const iuranWajib = parseFloat(due.iuran_wajib?.toString() || '0')
          const simpananWajib = parseFloat(due.simpanan_wajib?.toString() || '0')
          
          acc.iuran_wajib += iuranWajib
          acc.simpanan_wajib += simpananWajib
          
          return acc
        },
        { iuran_wajib: 0, simpanan_wajib: 0 }
      )
      
      console.log('💰 [DuesDebug] Calculated totals:', calculated)
      setTotals(calculated)
      
    } catch (error) {
      console.error('❌ [DuesDebug] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  const filtered2024 = dues.filter(d => d.tahun === 2024)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dues Debug Page - Year 2024</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Jumlah Iuran Wajib</h2>
          <div className="text-3xl font-bold text-blue-600">
            Rp {totals.iuran_wajib.toLocaleString('id-ID')}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Expected: Rp 18.850.000
          </div>
          <div className="text-sm mt-1">
            {totals.iuran_wajib === 18850000 ? '✅ Match' : '❌ No Match'}
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Jumlah Simpanan Wajib</h2>
          <div className="text-3xl font-bold text-green-600">
            Rp {totals.simpanan_wajib.toLocaleString('id-ID')}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Expected: Rp 34.100.000
          </div>
          <div className="text-sm mt-1">
            {totals.simpanan_wajib === 34100000 ? '✅ Match' : '❌ No Match'}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Total Records:</strong> {dues.length}
          </div>
          <div>
            <strong>2024 Records:</strong> {filtered2024.length}
          </div>
          <div>
            <strong>Raw Iuran Wajib:</strong> {totals.iuran_wajib}
          </div>
          <div>
            <strong>Raw Simpanan Wajib:</strong> {totals.simpanan_wajib}
          </div>
        </div>
      </div>
      
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Sample 2024 Records</h2>
        <div className="space-y-2">
          {filtered2024.slice(0, 5).map((record, index) => (
            <div key={record.id} className="text-sm border-b pb-2">
              <div><strong>#{index + 1}</strong> - {record.member?.nama_lengkap}</div>
              <div>Tahun: {record.tahun}, Bulan: {record.bulan}, Status: {record.status}</div>
              <div>Iuran: {record.iuran_wajib?.toLocaleString('id-ID')}, Simpanan: {record.simpanan_wajib?.toLocaleString('id-ID')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}