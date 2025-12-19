import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

interface Due {
  id: string
  member_id: string
  bulan: number
  tahun: number
  iuran_wajib: number
  iuran_sukarela: number
  simpanan_wajib: number
  status: string
  member?: { nama_lengkap: string }
}

export function DuesCalculationTest() {
  const [dues, setDues] = useState<Due[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<number | 'all'>(2024)
  const [status, setStatus] = useState<'all' | 'lunas' | 'belum_lunas'>('all')

  useEffect(() => {
    fetchDues()
  }, [])

  const fetchDues = async () => {
    try {
      const { data, error } = await supabase
        .from('dues')
        .select('id, member_id, bulan, tahun, iuran_wajib, iuran_sukarela, simpanan_wajib, status, member:members!left(nama_lengkap)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalized = data.map((d: any) => ({
        ...d,
        iuran_wajib: Number(d.iuran_wajib),
        iuran_sukarela: Number(d.iuran_sukarela),
        simpanan_wajib: Number(d.simpanan_wajib || 0),
      }))

      setDues(normalized)
      console.log('DEBUG - Raw dues data:', normalized.length)
      console.log('DEBUG - Sample data:', normalized.slice(0, 3))
    } catch (error) {
      console.error('Error fetching dues:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const result = dues.filter((d) => {
      const matchStatus = status === 'all' ? true : d.status === status
      const matchYear = year === 'all' ? true : d.tahun === year
      return matchStatus && matchYear
    })
    
    console.log('DEBUG - Filter params:', { status, year })
    console.log('DEBUG - Total dues:', dues.length)
    console.log('DEBUG - Filtered dues:', result.length)
    console.log('DEBUG - Sample filtered data:', result.slice(0, 3))
    
    return result
  }, [dues, status, year])

  const totalAll = useMemo(() => {
    const result = filtered.reduce(
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
    
    console.log('DEBUG - Total calculation result:', result)
    console.log('DEBUG - Filtered data count for calculation:', filtered.length)
    
    return result
  }, [filtered])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dues Calculation Test</h1>
      
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Year Filter:</label>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Years</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Status Filter:</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">Calculation Results</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Filtered Records</div>
            <div className="text-xl font-bold">{filtered.length}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Jumlah Iuran</div>
            <div className="text-xl font-bold">{formatCurrency(totalAll.iuran_wajib)}</div>
            {year === 2024 && (
              <div className="text-xs mt-1">
                Target: Rp 18.850.000 {totalAll.iuran_wajib === 18850000 ? '✅' : '❌'}
              </div>
            )}
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Simpanan Sukarela</div>
            <div className="text-xl font-bold">{formatCurrency(totalAll.iuran_sukarela)}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Simpanan Wajib</div>
            <div className="text-xl font-bold">{formatCurrency(totalAll.simpanan_wajib)}</div>
            {year === 2024 && (
              <div className="text-xs mt-1">
                Target: Rp 34.100.000 {totalAll.simpanan_wajib === 34100000 ? '✅' : '❌'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Sample Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Member</th>
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-left">Year</th>
                <th className="px-4 py-2 text-left">Iuran Wajib</th>
                <th className="px-4 py-2 text-left">Simpanan Wajib</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((due) => (
                <tr key={due.id} className="border-t">
                  <td className="px-4 py-2">{due.member?.nama_lengkap || 'Unknown'}</td>
                  <td className="px-4 py-2">{due.bulan}</td>
                  <td className="px-4 py-2">{due.tahun}</td>
                  <td className="px-4 py-2">{formatCurrency(due.iuran_wajib)}</td>
                  <td className="px-4 py-2">{formatCurrency(due.simpanan_wajib)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      due.status === 'lunas' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {due.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}