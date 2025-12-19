import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DuesRecord {
  id: string;
  member_id: string;
  bulan: number;
  tahun: number;
  iuran_sukarela: string;
  status: string;
}

export const IuranSukarelaDebug: React.FC = () => {
  const [data, setData] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    total: number;
    count: number;
    recordsWithValue: number;
  }>({ total: 0, count: 0, recordsWithValue: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: dues2024, error } = await supabase
          .from('dues')
          .select('id, member_id, bulan, tahun, iuran_sukarela, status')
          .eq('tahun', 2024);
        
        if (error) {
          console.error('Error fetching data:', error);
          return;
        }
        
        setData(dues2024 || []);
        
        // Calculate summary
        let total = 0;
        let recordsWithValue = 0;
        
        dues2024?.forEach(record => {
          const value = parseFloat(record.iuran_sukarela) || 0;
          total += value;
          if (value > 0) {
            recordsWithValue++;
          }
        });
        
        setSummary({
          total,
          count: dues2024?.length || 0,
          recordsWithValue
        });
        
        console.log('🔍 [IuranSukarelaDebug] Data loaded:', {
          totalRecords: dues2024?.length,
          totalIuranSukarela: total,
          recordsWithValue,
          expected: 2400000,
          match: total === 2400000
        });
        
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading debug data...</div>;
  }

  const recordsWithIuranSukarela = data.filter(record => parseFloat(record.iuran_sukarela) > 0);

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Debug: Iuran Sukarela 2024</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 p-4 rounded">
          <h3 className="font-semibold">Total Records</h3>
          <p className="text-2xl">{summary.count}</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded">
          <h3 className="font-semibold">Records with Iuran Sukarela</h3>
          <p className="text-2xl">{summary.recordsWithValue}</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded">
          <h3 className="font-semibold">Total Iuran Sukarela</h3>
          <p className="text-2xl text-blue-600">Rp {summary.total.toLocaleString('id-ID')}</p>
          <p className="text-sm text-gray-500">Expected: Rp 2.400.000</p>
          <p className={`text-sm ${summary.total === 2400000 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.total === 2400000 ? '✅ Match' : '❌ Mismatch'}
          </p>
        </div>
      </div>
      
      {recordsWithIuranSukarela.length > 0 && (
        <div className="bg-white dark:bg-gray-700 p-4 rounded">
          <h3 className="font-semibold mb-3">Records with Iuran Sukarela &gt; 0:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-600">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Member ID</th>
                  <th className="px-4 py-2 text-left">Bulan</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recordsWithIuranSukarela.map(record => (
                  <tr key={record.id} className="border-b dark:border-gray-600">
                    <td className="px-4 py-2 text-sm">{record.id.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-sm">{record.member_id.slice(0, 8)}...</td>
                    <td className="px-4 py-2">{record.bulan}</td>
                    <td className="px-4 py-2 font-semibold">
                      Rp {parseFloat(record.iuran_sukarela).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.status === 'lunas' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};