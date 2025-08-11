import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertTriangle, Check, X, Download, Eye, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'

type CSVDataType = 'members' | 'dues' | 'loans' | 'expenses'

interface CSVData {
  data: any[]
  errors: Papa.ParseError[]
  meta: Papa.ParseMeta
}

export function UploadCSVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dataType, setDataType] = useState<CSVDataType>('members')
  const [parsedData, setParsedData] = useState<CSVData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Hanya file CSV yang diperbolehkan')
        return
      }
      setFile(selectedFile)
      parseCSV(selectedFile)
    }
  }, [dataType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const parseCSV = (file: File) => {
    setIsProcessing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validasi data sebelum diproses
        if (dataType === 'members') {
          // Periksa apakah ada id_anggota yang kosong atau duplikat dalam file
          const invalidIds: {row: number, id: string, reason: string}[] = []
          const ids = results.data
            .map((item: any, index: number) => {
              const id_anggota = item.id_anggota
              
              // Validasi id_anggota
              if (!id_anggota || id_anggota.trim() === '') {
                invalidIds.push({row: index + 2, id: 'Kosong', reason: 'ID Anggota tidak boleh kosong'})
                return null
              }
              
              return id_anggota
            })
            .filter((id: string | null) => id !== null)
          
          // Cek duplikasi id_anggota dalam file
          const duplicateIds = ids.filter((id: string, index: number, self: string[]) => 
            self.indexOf(id) !== index
          )
          
          duplicateIds.forEach((id: string) => {
            // Cari semua baris dengan id_anggota yang sama
            results.data.forEach((item: any, index: number) => {
              if (item.id_anggota === id) {
                invalidIds.push({row: index + 2, id, reason: 'ID Anggota duplikat dalam file'})
              }
            })
          })
          
          // Tampilkan peringatan jika ada id_anggota tidak valid
          if (invalidIds.length > 0) {
            toast.custom(
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold mb-1 text-yellow-700">Ditemukan masalah dengan data ID Anggota:</p>
                    <ul className="text-sm max-h-60 overflow-y-auto text-yellow-700">
                      {invalidIds.map((item, index) => (
                        <li key={index} className="mb-1">
                          Baris {item.row}: ID Anggota {item.id} - {item.reason}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-yellow-700">Data akan tetap diproses, tetapi baris dengan ID Anggota tidak valid mungkin gagal diupload.</p>
                  </div>
                </div>
              </div>,
              { duration: 8000 }
            )
          }
        } else if (dataType === 'dues') {
          // Validasi data iuran
          const invalidDues: {row: number, reason: string}[] = []
          
          results.data.forEach((item: any, index: number) => {
            const rowNum = index + 2
            
            // Skip empty rows or rows without essential data (konsisten dengan logika upload)
            if (!item || Object.keys(item).length === 0) {
              return;
            }
            
            // Skip rows without id_anggota (konsisten dengan logika upload)
            if (!item.id_anggota || item.id_anggota.trim() === '') {
              return;
            }
            
            // Validasi bulan
            const bulan = parseInt(item.bulan)
            if (!bulan || bulan < 1 || bulan > 12) {
              invalidDues.push({row: rowNum, reason: 'Bulan harus antara 1-12'})
            }
            
            // Validasi tahun
            const tahun = parseInt(item.tahun)
            if (!tahun || tahun < 2023 || tahun > 2100) {
              invalidDues.push({row: rowNum, reason: 'Tahun harus antara 2023-2100'})
            }
            
            // Validasi iuran_wajib
            const iuranWajib = parseFloat(item.iuran_wajib)
            if (isNaN(iuranWajib) || iuranWajib < 0) {
              invalidDues.push({row: rowNum, reason: 'Iuran wajib harus berupa angka positif'})
            }
            
            // Validasi iuran_sukarela
            const iuranSukarela = parseFloat(item.iuran_sukarela)
            if (isNaN(iuranSukarela) || iuranSukarela < 0) {
              invalidDues.push({row: rowNum, reason: 'Iuran sukarela harus berupa angka positif'})
            }
            
            // Validasi status
            if (item.status && !['lunas', 'belum_lunas', 'Lunas', 'Belum Lunas'].includes(item.status)) {
              invalidDues.push({row: rowNum, reason: 'Status harus "Lunas" atau "Belum Lunas"'})
            }
          })
          
          // Tampilkan peringatan jika ada data tidak valid
          if (invalidDues.length > 0) {
            toast.custom(
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold mb-1 text-yellow-700">Ditemukan masalah dengan data iuran:</p>
                    <ul className="text-sm max-h-60 overflow-y-auto text-yellow-700">
                      {invalidDues.slice(0, 10).map((item, index) => (
                        <li key={index} className="mb-1">
                          Baris {item.row}: {item.reason}
                        </li>
                      ))}
                      {invalidDues.length > 10 && (
                        <li className="text-xs text-yellow-600">... dan {invalidDues.length - 10} masalah lainnya</li>
                      )}
                    </ul>
                    <p className="mt-2 text-sm text-yellow-700">Data akan tetap diproses, tetapi baris dengan data tidak valid mungkin gagal diupload.</p>
                  </div>
                </div>
              </div>,
              { duration: 8000 }
            )
          }
        }
        
        setParsedData(results as CSVData)
        setPreviewData(results.data.slice(0, 5))
        setIsProcessing(false)
        setShowPreview(true)
        toast.success('File CSV berhasil diproses')
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        toast.error('Gagal memproses file CSV')
        setIsProcessing(false)
      }
    })
  }

  const handleUpload = async () => {
    if (!parsedData || !file) {
      toast.error('Tidak ada data untuk diupload')
      return
    }

    setIsUploading(true)
    try {
      // Cek koneksi Supabase
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }
      
      // Upload data ke Supabase berdasarkan tipe data
      let successCount = 0
      const errors = []
      let currentRow = 0
      
      for (const [index, item] of parsedData.data.entries()) {
        const actualRowNum = index + 2 // +2 karena index dimulai dari 0 dan baris 1 adalah header
        
        // Skip empty rows or rows without essential data
        if (!item || Object.keys(item).length === 0) {
          continue;
        }
        
        // For loans, skip rows without id_anggota
        if (dataType === 'loans' && (!item.id_anggota || item.id_anggota.trim() === '')) {
          continue;
        }
        
        // For dues, skip rows without id_anggota
        if (dataType === 'dues' && (!item.id_anggota || item.id_anggota.trim() === '')) {
          continue;
        }
        
        // For members, skip rows without essential data
        if (dataType === 'members' && (!item.nama_lengkap || item.nama_lengkap.trim() === '')) {
          continue;
        }
        
        currentRow++ // Hanya increment untuk baris yang benar-benar diproses
        
        try {
          let result
          
          switch (dataType) {
            case 'members':
              // Konversi data CSV ke format yang sesuai dengan tabel members
              const memberData = {
                id_anggota: item.id_anggota || '',
                nama_lengkap: item.nama_lengkap || '',
                nik: item.nik || '',
                alamat: item.alamat || '',
                no_hp: item.no_telepon || '',
                status_keanggotaan: (item.status?.toLowerCase() === 'aktif' ? 'aktif' : 
                                    item.status?.toLowerCase() === 'non_aktif' ? 'non_aktif' : 'pending'),
                tanggal_masuk: item.tanggal_bergabung || new Date().toISOString().split('T')[0],
                jabatan: item.jabatan || 'Anggota'
              }
              
              // Periksa apakah id_anggota sudah ada di database
              if (memberData.id_anggota) {
                const { data: existingMembers, error: checkError } = await supabase
                  .from('members')
                  .select('id')
                  .eq('id_anggota', memberData.id_anggota)
                
                if (checkError) throw checkError;
                
                if (existingMembers && existingMembers.length > 0) {
                  // Jika id_anggota sudah ada, update data anggota yang sudah ada (update yang pertama ditemukan)
                  result = await supabase
                    .from('members')
                    .update(memberData)
                    .eq('id', existingMembers[0].id)
                } else {
                  // Jika id_anggota belum ada, insert data anggota baru
                  result = await supabase.from('members').insert(memberData)
                }
              } else {
                // Jika id_anggota kosong, langsung insert
                result = await supabase.from('members').insert(memberData)
              }
              break
              
            case 'dues':
                // Konversi data CSV ke format yang sesuai dengan tabel dues
                // Cari member_id berdasarkan id_anggota dari CSV
                let memberIdForDue = null;
                if (item.id_anggota && item.id_anggota.trim() !== '') {
                  const { data: members, error: memberError } = await supabase
                    .from('members')
                    .select('id')
                    .eq('id_anggota', item.id_anggota.trim());

                  if (memberError) throw memberError;
                  if (members && members.length > 0) {
                    memberIdForDue = members[0].id;
                  } else {
                    throw new Error(`Member with ID Anggota ${item.id_anggota} not found.`);
                  }
                } else {
                  throw new Error('ID Anggota is missing for dues entry.');
                }

                // Parse tanggal_bayar from MM/DD/YYYY format to YYYY-MM-DD
                let tanggalBayar = new Date().toISOString().split('T')[0];
                if (item.tanggal_bayar) {
                  try {
                    // Handle MM/DD/YYYY format from CSV
                    const dateParts = item.tanggal_bayar.split('/');
                    if (dateParts.length === 3) {
                      const month = dateParts[0].padStart(2, '0');
                      const day = dateParts[1].padStart(2, '0');
                      const year = dateParts[2];
                      tanggalBayar = `${year}-${month}-${day}`;
                    }
                  } catch (e) {
                    console.warn('Failed to parse tanggal_bayar:', item.tanggal_bayar);
                  }
                }

                const dueData = {
                  member_id: memberIdForDue,
                  bulan: parseInt(item.bulan) || 1,
                  tahun: parseInt(item.tahun) || new Date().getFullYear(),
                  iuran_wajib: parseFloat(item.iuran_wajib) || 0,
                  iuran_sukarela: parseFloat(item.iuran_sukarela) || 0,
                  simpanan_wajib: parseFloat(item.simpanan_wajib) || 0,
                  tanggal_bayar: tanggalBayar,
                  status: item.status?.toLowerCase() === 'lunas' ? 'lunas' : 'belum_lunas'
                };

                // Try INSERT first, if duplicate (unique constraint), perform UPDATE
                result = await supabase.from('dues').insert(dueData);
                
                // If duplicate (unique constraint on member_id, bulan, tahun), perform UPDATE
                if (result.error && result.error.code === '23505') {
                  result = await supabase
                    .from('dues')
                    .update(dueData)
                    .eq('member_id', memberIdForDue)
                    .eq('bulan', dueData.bulan)
                    .eq('tahun', dueData.tahun);
                }
                break;
              
            case 'loans':
                // Konversi data CSV ke format yang sesuai dengan tabel loans
                // Cari member_id berdasarkan id_anggota dari CSV
                let memberIdForLoan = null;
                if (item.id_anggota && item.id_anggota.trim() !== '') {
                  const { data: members, error: memberError } = await supabase
                    .from('members')
                    .select('id')
                    .eq('id_anggota', item.id_anggota.trim());

                  if (memberError) throw memberError;
                  if (members && members.length > 0) {
                    memberIdForLoan = members[0].id;
                  } else {
                    throw new Error(`Member with ID Anggota ${item.id_anggota} not found.`);
                  }
                } else {
                  throw new Error('ID Anggota is missing for loan entry.');
                }

                // Parse tanggal_pinjam from MM/DD/YYYY format to YYYY-MM-DD
                let tanggalPinjam = new Date().toISOString().split('T')[0];
                if (item.tanggal_pinjam) {
                  try {
                    // Handle MM/DD/YYYY format from CSV
                    const dateParts = item.tanggal_pinjam.split('/');
                    if (dateParts.length === 3) {
                      const month = dateParts[0].padStart(2, '0');
                      const day = dateParts[1].padStart(2, '0');
                      const year = dateParts[2];
                      tanggalPinjam = `${year}-${month}-${day}`;
                    }
                  } catch (e) {
                    console.warn('Failed to parse tanggal_pinjam:', item.tanggal_pinjam);
                  }
                }

                // Parse sisa_pinjaman, fallback to jumlah_pinjaman if not provided
                const jumlahPinjaman = parseFloat(item.jumlah_pinjaman?.toString().replace(/[^0-9.-]/g, '')) || 0;
                const sisaPinjaman = parseFloat(item.sisa_pinjaman?.toString().replace(/[^0-9.-]/g, '')) || jumlahPinjaman;

                const loanData = {
                  member_id: memberIdForLoan,
                  jumlah_pinjaman: jumlahPinjaman,
                  bunga_persen: parseFloat(item.bunga) || 0,
                  tenor_bulan: parseInt(item.jangka_waktu) || 1,
                  tanggal_pinjaman: tanggalPinjam,
                  status: item.status?.toLowerCase() === 'lunas' ? 'lunas' : (item.status?.toLowerCase() === 'belum lunas' ? 'aktif' : 'pending'),
                  sisa_pinjaman: sisaPinjaman,
                  angsuran_bulanan: jumlahPinjaman / (parseInt(item.jangka_waktu) || 1) // Calculate monthly installment
                };

                // Insert loan data
                const loanResult = await supabase.from('loans').insert(loanData).select('id').single();
                if (loanResult.error) throw loanResult.error;
                
                const loanId = loanResult.data.id;
                
                // Process monthly payments if provided
                const monthNames = [
                  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                  'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
                ];
                
                const payments = [];
                monthNames.forEach((month, index) => {
                  const paymentKey = `bayar_angsuran_${month}`;
                  const paymentAmount = parseFloat(item[paymentKey]?.toString().replace(/[^0-9.-]/g, '')) || 0;
                  
                  if (paymentAmount > 0) {
                    const paymentDate = new Date(parseInt(tanggalPinjam.split('-')[0]), index, 1);
                    payments.push({
                      loan_id: loanId,
                      angsuran_ke: index + 1,
                      angsuran_pokok: paymentAmount,
                      angsuran_bunga: 0, // Can be calculated based on loan terms
                      total_angsuran: paymentAmount,
                      tanggal_bayar: paymentDate.toISOString().split('T')[0],
                      status: 'lunas'
                    });
                  }
                });
                
                // Insert payment records if any
                if (payments.length > 0) {
                  const paymentsResult = await supabase.from('loan_payments').insert(payments);
                  if (paymentsResult.error) {
                    console.warn('Failed to insert some loan payments:', paymentsResult.error);
                  }
                }
                
                result = { error: null }; // Mark as successful
                break;
              
            case 'expenses':
                // Konversi data CSV ke format yang sesuai dengan tabel expenses
                
                // Parse tanggal from MM/DD/YYYY format to YYYY-MM-DD
                let tanggalExpense = new Date().toISOString().split('T')[0];
                if (item.tanggal) {
                  try {
                    // Handle MM/DD/YYYY format from CSV
                    const dateParts = item.tanggal.split('/');
                    if (dateParts.length === 3) {
                      const month = dateParts[0].padStart(2, '0');
                      const day = dateParts[1].padStart(2, '0');
                      const year = dateParts[2];
                      tanggalExpense = `${year}-${month}-${day}`;
                    }
                  } catch (e) {
                    console.warn('Failed to parse tanggal:', item.tanggal);
                  }
                }
                
                // Parse jumlah - remove commas and convert to number
                const jumlahExpense = parseFloat(item.jumlah?.toString().replace(/[^0-9.-]/g, '')) || 0;
                
                // Get current user ID or use a default UUID for CSV uploads
                const session = await supabase.auth.getSession();
                const currentUserId = session.data.session?.user?.id || '00000000-0000-0000-0000-000000000000'; // Default UUID for CSV uploads
                
                const expenseData = {
                  kategori: item.kategori || 'Lainnya',
                  deskripsi: item.keterangan || '', // Map 'keterangan' from CSV to 'deskripsi' in database
                  jumlah: jumlahExpense,
                  tanggal: tanggalExpense,
                  status_otorisasi: 'pending', // Default status
                  created_by: currentUserId // Always provide a valid UUID
                };

                result = await supabase.from('expenses').insert(expenseData);
                break;
          }
          
          if (result?.error) {
            // Pesan error yang lebih spesifik untuk kasus duplikasi
            if (result.error.message.includes('violates unique constraint')) {
              if (result.error.message.includes('members_id_anggota_key')) {
                errors.push(`Baris ${actualRowNum}: ID Anggota sudah terdaftar dalam database`)
              } else if (result.error.message.includes('members_nik_key')) {
                errors.push(`Baris ${actualRowNum}: NIK sudah terdaftar dalam database`)
              } else {
                errors.push(`Baris ${actualRowNum}: Data sudah terdaftar dalam database`)
              }
            } else {
              errors.push(`Baris ${actualRowNum}: ${result.error.message}`)
            }
          } else {
            successCount++
          }
        } catch (err: any) {
          errors.push(`Baris ${actualRowNum}: ${err.message || 'Terjadi kesalahan'}`)
        }
      }
      
      if (errors.length > 0) {
        console.error('Errors during upload:', errors)
        if (successCount > 0) {
          toast.success(`${successCount} data berhasil diupload`)
        }
        
        // Tampilkan pesan error yang lebih detail
        toast.error(
          <div>
            <p className="font-semibold mb-1">{`${errors.length} data gagal diupload:`}</p>
            <ul className="text-sm max-h-60 overflow-y-auto">
              {errors.map((err, index) => (
                <li key={index} className="mb-1">{err}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 }
        )
      } else {
        toast.success(`${successCount} data berhasil diupload`)
      }
      
      resetForm()
    } catch (error: any) {
      console.error('Error uploading data:', error)
      toast.error('Gagal mengupload data: ' + (error.message || 'Terjadi kesalahan'))
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setParsedData(null)
    setPreviewData([])
    setShowPreview(false)
  }

  const downloadTemplate = () => {
    let headers: string[] = []
    let filename = ''

    switch (dataType) {
      case 'members':
        headers = ['id_anggota', 'nama_lengkap', 'no_telepon', 'alamat', 'tanggal_bergabung', 'status', 'jabatan', 'nik']
        filename = 'template-anggota.csv'
        break
      case 'dues':
        headers = ['id_anggota', 'nama_lengkap', 'bulan', 'tahun', 'iuran_wajib', 'iuran_sukarela', 'simpanan_wajib', 'tanggal_bayar', 'status']
        filename = 'template-iuran.csv'
        break
      case 'loans':
        headers = [
          'id_anggota', 'nama_anggota',
          'bayar_angsuran_januari', 'bayar_angsuran_februari', 'bayar_angsuran_maret', 'bayar_angsuran_april',
          'bayar_angsuran_mei', 'bayar_angsuran_juni', 'bayar_angsuran_juli', 'bayar_angsuran_agustus',
          'bayar_angsuran_september', 'bayar_angsuran_oktober', 'bayar_angsuran_november', 'bayar_angsuran_desember',
          'jumlah_pinjaman', 'sisa_pinjaman', 'tanggal_pinjam', 'jangka_waktu', 'bunga', 'status'
        ]
        filename = 'template-pinjaman.csv'
        break
      case 'expenses':
        headers = ['kategori', 'jumlah', 'tanggal', 'keterangan', 'disetujui_oleh']
        filename = 'template-pengeluaran.csv'
        break
    }

    let csvContent = headers.join(',') + '\n'
    
    // Add sample data for better understanding
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');
    const currentDate = `${currentYear}-${currentMonth}-${currentDay}`;
    const currentDateSlash = `${currentMonth}/${currentDay}/${currentYear}`;
    
    if (dataType === 'dues') {
      csvContent += `001-KP2ACIMAHI,Damar Tirta,1,${currentYear},50000,0,25000,${currentDateSlash},Lunas\n`
      csvContent += `002-KP2ACIMAHI,Artesis Cimindi Raya,1,${currentYear},50000,25000,25000,${currentDateSlash},Lunas\n`
      csvContent += `003-KP2ACIMAHI,Ahmad Rahman,1,${currentYear},50000,0,25000,${currentDateSlash},Belum Lunas\n`
    } else if (dataType === 'members') {
      csvContent += `001-KP2ACIMAHI,Damar Tirta,081234567001,Jl. Sudirman No. 123,${currentDate},aktif,Ketua,3273010101800001\n`
      csvContent += `002-KP2ACIMAHI,Artesis Cimindi Raya,081234567002,Jl. Ahmad Yani No. 456,${currentDate},aktif,Bendahara,3273010201800002\n`
    } else if (dataType === 'loans') {
      csvContent += `001-KP2ACIMAHI,Damar Tirta,,,,,,,1000000,1000000,1000000,1000000,1000000,,10000000,5000000,6/12/${currentYear},10,0,Lunas\n`
      csvContent += `002-KP2ACIMAHI,Artesis Cimindi Raya,,,,,,,,,,,,1000000,7500000,7500000,8/7/${currentYear},10,0,Belum Lunas\n`
    } else if (dataType === 'expenses') {
      csvContent += `Operasional,500000,${currentDate},Biaya listrik dan air,Bendahara\n`
      csvContent += `Administrasi,200000,${currentDate},Biaya ATK,Sekretaris\n`
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Template ${filename} berhasil diunduh`)
  }

  const getColumnHeaders = () => {
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) return []
    return Object.keys(parsedData.data[0])
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Data CSV</h2>
        <p className="text-gray-600 mb-6">
          Upload file CSV untuk mengimpor data ke sistem. Pastikan format data sesuai dengan template.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Data</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as CSVDataType)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!!file}
              >
                <option value="members">Data Anggota</option>
                <option value="dues">Data Iuran</option>
                <option value="loans">Data Pinjaman</option>
                <option value="expenses">Data Pengeluaran</option>
              </select>
            </div>

            <div className="mb-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'} ${file ? 'bg-green-50 border-green-300' : ''}`}
              >
                <input {...getInputProps()} />
                {isProcessing ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Memproses file...</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
                      <Check className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetForm(); }}
                      className="mt-3 text-xs text-red-600 hover:text-red-800 flex items-center"
                    >
                      <X className="h-3 w-3 mr-1" /> Hapus file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">Drag & drop file CSV di sini</p>
                    <p className="text-xs text-gray-500 mt-1">atau klik untuk memilih file</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </button>

              <button
                onClick={handleUpload}
                disabled={!parsedData || isUploading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Upload Data</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-1" /> Informasi Format
              </h3>
              <div className="text-xs text-gray-600 space-y-2">
                {dataType === 'members' && (
                  <>
                    <p>Format kolom untuk Data Anggota:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>id_anggota: ID unik anggota (wajib)</li>
                      <li>nama_lengkap: Nama lengkap anggota</li>
                      <li>no_telepon: Nomor telepon</li>
                      <li>alamat: Alamat lengkap</li>
                      <li>tanggal_bergabung: Format YYYY-MM-DD</li>
                      <li>status: aktif/nonaktif</li>
                      <li>jabatan: Jabatan anggota (default: Anggota)</li>
                      <li>nik: Nomor Induk Kependudukan (opsional)</li>
                    </ul>
                  </>
                )}

                {dataType === 'dues' && (
                  <>
                    <p>Format kolom untuk Data Iuran:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>id_anggota: ID anggota yang membayar</li>
                      <li>bulan: Bulan pembayaran (1-12)</li>
                      <li>tahun: Tahun pembayaran (YYYY)</li>
                      <li>iuran_wajib: Jumlah iuran wajib</li>
                      <li>iuran_sukarela: Jumlah iuran sukarela</li>
                      <li>simpanan_wajib: Jumlah simpanan wajib</li>
                      <li>tanggal_bayar: Format YYYY-MM-DD</li>
                      <li>status: lunas/belum</li>
                    </ul>
                  </>
                )}

                {dataType === 'loans' && (
                  <>
                    <p>Format kolom untuk Data Pinjaman:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>id_anggota: ID anggota peminjam (wajib)</li>
                      <li>nama_anggota: Nama anggota (opsional)</li>
                      <li>bayar_angsuran_[bulan]: Pembayaran per bulan (opsional)</li>
                      <li>jumlah_pinjaman: Jumlah pinjaman total</li>
                      <li>sisa_pinjaman: Sisa pinjaman yang belum dibayar</li>
                      <li>tanggal_pinjam: Format MM/DD/YYYY</li>
                      <li>jangka_waktu: Tenor dalam bulan</li>
                      <li>bunga: Persentase bunga</li>
                      <li>status: aktif/lunas</li>
                    </ul>
                  </>
                )}

                {dataType === 'expenses' && (
                  <>
                    <p>Format kolom untuk Data Pengeluaran:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>kategori: Kategori pengeluaran</li>
                      <li>jumlah: Jumlah pengeluaran</li>
                      <li>tanggal: Format YYYY-MM-DD</li>
                      <li>keterangan: Deskripsi pengeluaran</li>
                      <li>disetujui_oleh: Email pengurus</li>
                    </ul>
                  </>
                )}
              </div>

              {parsedData && parsedData.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-800">Ditemukan {parsedData.errors.length} error:</p>
                      <ul className="mt-1 text-xs text-red-700 list-disc pl-5 space-y-1">
                        {parsedData.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>
                            Baris {error.row}: {error.message}
                          </li>
                        ))}
                        {parsedData.errors.length > 3 && (
                          <li>...dan {parsedData.errors.length - 3} error lainnya</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Data */}
      {showPreview && parsedData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Preview Data</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Menampilkan {Math.min(5, parsedData.data.length)} dari {parsedData.data.length} baris
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {getColumnHeaders().map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {getColumnHeaders().map((header, colIndex) => (
                      <td key={colIndex} className="px-4 py-3 text-sm text-gray-500">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}