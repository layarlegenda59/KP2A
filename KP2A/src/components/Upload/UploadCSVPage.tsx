import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaUpload,
  FaFile,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaDownload,
  FaUsers,
  FaDollarSign,
  FaCreditCard,
  FaReceipt,
  FaExchangeAlt,
  FaInfoCircle,
  FaTable,
  FaCheckCircle,
  FaTimesCircle,
  FaCloudUploadAlt,
  FaFileExcel
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { membersApi, duesApi, loansApi, expensesApi } from '../../lib/api'
import { parseIndonesianToISO } from '../../utils/dateFormat'

type CSVDataType = 'members' | 'dues' | 'loans' | 'expenses'

interface CSVData {
  data: any[]
  errors: Papa.ParseError[]
  meta: Papa.ParseMeta
}

interface DataTypeOption {
  id: CSVDataType
  name: string
  description: string
  icon: React.ComponentType<any>
  color: string
}

const dataTypes: DataTypeOption[] = [
  { id: 'members', name: 'Data Anggota', description: 'Import data anggota koperasi', icon: FaUsers, color: 'blue' },
  { id: 'dues', name: 'Data Iuran', description: 'Import data iuran bulanan', icon: FaDollarSign, color: 'green' },
  { id: 'loans', name: 'Data Pinjaman', description: 'Import data pinjaman anggota', icon: FaCreditCard, color: 'purple' },
  { id: 'expenses', name: 'Data Buku Kas', description: 'Import data pemasukan & pengeluaran', icon: FaReceipt, color: 'red' },
]

export function UploadCSVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dataType, setDataType] = useState<CSVDataType>('members')
  const [parsedData, setParsedData] = useState<CSVData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null)
  const [excelSheets, setExcelSheets] = useState<{ iuranWajib: any[]; simpananWajib: any[]; simpananSukarela: any[] } | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')

      if (!isCSV && !isExcel) {
        toast.error('Hanya file CSV atau Excel (.xlsx) yang diperbolehkan')
        return
      }

      setFile(selectedFile)
      setUploadResult(null)
      setExcelSheets(null)

      if (isExcel && dataType === 'dues') {
        parseExcel(selectedFile)
      } else if (isCSV) {
        parseCSV(selectedFile)
      } else {
        toast.error('Untuk tipe data ini gunakan file CSV')
      }
    }
  }, [dataType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dataType === 'dues'
      ? { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
      : { 'text/csv': ['.csv'] },
    maxFiles: 1
  })

  const parseExcel = (file: File) => {
    setIsProcessing(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Get data from each sheet
        const iuranWajibSheet = workbook.Sheets['Iuran Wajib']
        const simpananWajibSheet = workbook.Sheets['Simpanan Wajib']
        const simpananSukarelaSheet = workbook.Sheets['Simpanan Sukarela']

        if (!iuranWajibSheet || !simpananWajibSheet || !simpananSukarelaSheet) {
          toast.error('File Excel harus memiliki 3 sheet: Iuran Wajib, Simpanan Wajib, Simpanan Sukarela')
          setIsProcessing(false)
          return
        }

        const iuranWajibData = XLSX.utils.sheet_to_json(iuranWajibSheet)
        const simpananWajibData = XLSX.utils.sheet_to_json(simpananWajibSheet)
        const simpananSukarelaData = XLSX.utils.sheet_to_json(simpananSukarelaSheet)

        setExcelSheets({
          iuranWajib: iuranWajibData,
          simpananWajib: simpananWajibData,
          simpananSukarela: simpananSukarelaData
        })

        // Show preview from first sheet
        setPreviewData(iuranWajibData.slice(0, 5))
        setParsedData({ data: iuranWajibData, errors: [], meta: {} as Papa.ParseMeta })
        setShowPreview(true)
        setIsProcessing(false)

        toast.success(`File Excel berhasil diproses: ${iuranWajibData.length} anggota dari 3 sheet`)
      } catch (error) {
        console.error('Error parsing Excel:', error)
        toast.error('Gagal memproses file Excel')
        setIsProcessing(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const parseCSV = (file: File) => {
    setIsProcessing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results as CSVData)
        setPreviewData(results.data.slice(0, 5))
        setIsProcessing(false)
        setShowPreview(true)
        toast.success(`File berhasil diproses: ${results.data.length} baris data`)
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
    setUploadProgress(0)

    try {
      // Create member map for lookup
      let memberMap = new Map<string, string>()
      if (dataType === 'dues' || dataType === 'loans') {
        const { data: members } = await membersApi.getAll({ limit: 10000 })
        if (members && members.length > 0) {
          members.forEach((m: any) => {
            if (m.id_anggota) {
              memberMap.set(m.id_anggota.toString().trim().toLowerCase(), m.id)
            }
          })
        }
      }

      let successCount = 0
      const errors: string[] = []
      const totalItems = parsedData.data.length

      for (const [index, item] of parsedData.data.entries()) {
        const actualRowNum = index + 2

        // Update progress
        setUploadProgress(Math.round(((index + 1) / totalItems) * 100))

        if (!item || typeof item !== 'object' || Object.keys(item).length === 0) continue
        if (item === null || item === undefined) continue

        try {
          switch (dataType) {
            case 'members':
              const memberData = {
                id_anggota: item.id_anggota || '',
                nama_lengkap: item.nama_lengkap || '',
                nik: item.nik || '',
                alamat: item.alamat || '',
                no_hp: item.no_telepon || '',
                status_keanggotaan: (item.status?.toLowerCase() === 'aktif' ? 'aktif' :
                  item.status?.toLowerCase() === 'non_aktif' ? 'non_aktif' : 'pending') as any,
                tanggal_masuk: parseIndonesianToISO(item.tanggal_bergabung) || parseIndonesianToISO(''),
                jabatan: item.jabatan || 'Anggota'
              }
              await membersApi.create(memberData)
              successCount++
              break

            case 'dues':
              // Check if we have Excel sheets data
              if (excelSheets) {
                // Process Excel with 3 sheets
                if (!item.id_anggota) throw new Error('ID Anggota kosong')
                const lookupKey = item.id_anggota.toString().trim().toLowerCase()
                let memberId = memberMap.get(lookupKey)

                if (!memberId) {
                  for (const [key, id] of memberMap.entries()) {
                    if (key && (lookupKey.startsWith(key) || key.startsWith(lookupKey))) {
                      const lenDiff = Math.abs(lookupKey.length - key.length)
                      if (lenDiff < 3) {
                        memberId = id
                        break
                      }
                    }
                  }
                }

                if (!memberId) {
                  throw new Error(`Anggota dengan ID ${item.id_anggota} tidak ditemukan`)
                }

                const tahun = parseInt(item.tahun) || new Date().getFullYear()
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                let monthsProcessed = 0

                // Find corresponding rows in other sheets
                const simpananWajibRow = excelSheets.simpananWajib.find((r: any) =>
                  r.id_anggota?.toString().trim().toLowerCase() === lookupKey
                )
                const simpananSukarelaRow = excelSheets.simpananSukarela.find((r: any) =>
                  r.id_anggota?.toString().trim().toLowerCase() === lookupKey
                )

                for (let bulan = 1; bulan <= 12; bulan++) {
                  const monthName = monthNames[bulan - 1]

                  // Get values from each sheet
                  const iuranWajib = parseFloat(item[monthName]) || 0
                  const simpananWajib = parseFloat(simpananWajibRow?.[monthName]) || 0
                  const simpananSukarela = parseFloat(simpananSukarelaRow?.[monthName]) || 0

                  // Skip if no payment data for this month
                  if (iuranWajib === 0 && simpananWajib === 0 && simpananSukarela === 0) continue

                  const dueData = {
                    member_id: memberId,
                    bulan: bulan,
                    tahun: tahun,
                    iuran_wajib: iuranWajib,
                    iuran_sukarela: simpananSukarela,
                    simpanan_wajib: simpananWajib,
                    tanggal_bayar: parseIndonesianToISO(''),
                    status: (iuranWajib > 0 ? 'lunas' : 'belum_lunas') as 'lunas' | 'belum_lunas'
                  }

                  const { error: dueError } = await duesApi.create(dueData)
                  if (dueError) {
                    if (!dueError.includes('sudah ada')) {
                      throw new Error(`Bulan ${bulan}: ${dueError}`)
                    }
                  } else {
                    monthsProcessed++
                  }
                }

                if (monthsProcessed > 0) successCount++
              } else {
                // CSV format - original logic
                if (!item.id_anggota) throw new Error('ID Anggota kosong')
                const csvLookupKey = item.id_anggota.toString().trim().toLowerCase()
                let csvMemberId = memberMap.get(csvLookupKey)

                if (!csvMemberId) {
                  for (const [key, id] of memberMap.entries()) {
                    if (key && (csvLookupKey.startsWith(key) || key.startsWith(csvLookupKey))) {
                      const lenDiff = Math.abs(csvLookupKey.length - key.length)
                      if (lenDiff < 3) {
                        csvMemberId = id
                        break
                      }
                    }
                  }
                }

                if (!csvMemberId) {
                  throw new Error(`Anggota dengan ID ${item.id_anggota} tidak ditemukan`)
                }

                // Simple CSV format with single row per dues entry
                const dueData = {
                  member_id: csvMemberId,
                  bulan: parseInt(item.bulan) || 1,
                  tahun: parseInt(item.tahun) || new Date().getFullYear(),
                  iuran_wajib: parseFloat(item.iuran_wajib) || 0,
                  iuran_sukarela: parseFloat(item.iuran_sukarela) || 0,
                  simpanan_wajib: parseFloat(item.simpanan_wajib) || 0,
                  tanggal_bayar: parseIndonesianToISO(''),
                  status: (item.status?.toLowerCase() === 'lunas' ? 'lunas' : 'belum_lunas') as 'lunas' | 'belum_lunas'
                }

                const { error: dueError } = await duesApi.create(dueData)
                if (dueError) {
                  if (dueError.includes('sudah ada')) throw new Error('Data iuran sudah ada (Duplikat)')
                  throw new Error(dueError)
                }
                successCount++
              }
              break


            case 'loans':
              // Process loan CSV
              if (!item.id_anggota) throw new Error('ID Anggota kosong')
              const loanLookupKey = item.id_anggota.toString().trim().toLowerCase()
              let loanMemberId = memberMap.get(loanLookupKey)

              if (!loanMemberId) {
                // Try partial match
                for (const [key, id] of memberMap.entries()) {
                  if (key && (loanLookupKey.startsWith(key) || key.startsWith(loanLookupKey))) {
                    const lenDiff = Math.abs(loanLookupKey.length - key.length)
                    if (lenDiff < 3) {
                      loanMemberId = id
                      break
                    }
                  }
                }
              }

              if (!loanMemberId) {
                throw new Error(`Anggota dengan ID ${item.id_anggota} tidak ditemukan`)
              }

              // Parse date using Indonesian format utility
              const tanggalPinjam = parseIndonesianToISO(item.tanggal_pinjam)

              const loanData = {
                member_id: loanMemberId,
                jumlah_pinjaman: parseFloat(item.jumlah_pinjaman) || 0,
                bunga_persen: parseFloat(item.bunga) || 0,
                tenor_bulan: parseInt(item.jangka_waktu) || 12,
                tanggal_pinjaman: tanggalPinjam,
                status: (item.status?.toLowerCase() === 'lunas' ? 'lunas' :
                  item.status?.toLowerCase() === 'aktif' ? 'aktif' :
                    item.status?.toLowerCase() === 'ditolak' ? 'ditolak' : 'pending') as 'aktif' | 'lunas' | 'pending' | 'ditolak'
              }

              const { error: loanError } = await loansApi.create(loanData)
              if (loanError) {
                throw new Error(loanError)
              }
              successCount++
              break

            case 'expenses':
              // Process Buku Kas data - support multiple column name variations
              const tanggalValue = item.tanggal || item.Tanggal || item.date || item.Date || item.tgl || item.Tgl
              const jumlahValue = item.jumlah || item.Jumlah || item.amount || item.Amount || item.nominal || item.Nominal
              const kategoriValue = item.kategori || item.Kategori || item.category || item.Category || item.jenis || item.Jenis || 'Lainnya'
              const tipeValue = item.tipe || item.Tipe || item.type || item.Type || 'debit'
              const deskripsiValue = item.deskripsi || item.Deskripsi || item.keterangan || item.Keterangan || item.description || item.Description || ''

              // Skip empty rows (common at end of CSV files)
              if (!tanggalValue && !jumlahValue) {
                console.log(`Skipping empty row ${actualRowNum}`)
                continue // Skip this row, don't count as error
              }

              if (!tanggalValue) {
                throw new Error(`Tanggal kosong`)
              }
              if (!jumlahValue) {
                throw new Error(`Jumlah kosong`)
              }

              const tipeNormalized = String(tipeValue).toLowerCase().trim()
              const expenseType: 'credit' | 'debit' =
                (tipeNormalized === 'kredit' || tipeNormalized === 'credit' || tipeNormalized === 'pemasukan' || tipeNormalized === 'masuk' || tipeNormalized === 'in')
                  ? 'credit'
                  : 'debit'

              const expenseData: Partial<{
                type: 'credit' | 'debit';
                kategori: string;
                deskripsi: string;
                jumlah: number;
                tanggal: string;
                status_otorisasi: 'pending' | 'approved' | 'rejected';
              }> = {
                type: expenseType,
                kategori: String(kategoriValue || 'Lainnya'),
                deskripsi: String(deskripsiValue || ''),
                jumlah: parseFloat(String(jumlahValue).replace(/[^0-9.-]/g, '')) || 0,
                tanggal: parseIndonesianToISO(String(tanggalValue)),
                status_otorisasi: 'approved'
              }

              const { error: expenseError } = await expensesApi.create(expenseData)
              if (expenseError) {
                throw new Error(expenseError)
              }
              successCount++
              break
          }
        } catch (err: any) {
          console.error(`Upload error at row ${actualRowNum}:`, err.message, item)
          errors.push(`Baris ${actualRowNum}: ${err.message}`)
        }
      }

      setUploadResult({ success: successCount, failed: errors.length })

      // Log all errors for debugging
      if (errors.length > 0) {
        console.error('Upload errors:', errors)
      }

      if (errors.length > 0 && successCount > 0) {
        toast.success(`${successCount} data berhasil diupload`)
        // Show first 3 errors
        const firstErrors = errors.slice(0, 3).join(', ')
        toast.error(`${errors.length} data gagal: ${firstErrors}${errors.length > 3 ? '...' : ''}`)
      } else if (errors.length > 0) {
        const firstErrors = errors.slice(0, 3).join(', ')
        toast.error(`Semua ${errors.length} data gagal: ${firstErrors}${errors.length > 3 ? '...' : ''}`)
      } else {
        toast.success(`Semua ${successCount} data berhasil diupload!`)
        setTimeout(() => resetForm(), 3000)
      }
    } catch (error: any) {
      console.error('Error uploading data:', error)
      toast.error('Gagal mengupload data: ' + (error.message || 'Terjadi kesalahan'))
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const resetForm = () => {
    setFile(null)
    setParsedData(null)
    setPreviewData([])
    setShowPreview(false)
    setUploadProgress(0)
    setUploadResult(null)
    setExcelSheets(null)
  }

  const downloadTemplate = () => {
    const currentYear = new Date().getFullYear()
    const day = String(new Date().getDate()).padStart(2, '0')
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    // Format Indonesia: DD/MM/YYYY
    const currentDateIndo = `${day}/${month}/${currentYear}`

    // For dues, create Excel file with 3 sheets
    if (dataType === 'dues') {
      downloadDuesExcelTemplate(currentYear)
      return
    }

    // For other types, use CSV
    let headers: string[] = []
    let filename = ''
    let sampleData: string[] = []

    switch (dataType) {
      case 'members':
        headers = ['id_anggota', 'nama_lengkap', 'no_telepon', 'alamat', 'tanggal_bergabung', 'status', 'jabatan', 'nik']
        filename = 'template-anggota.csv'
        sampleData = [
          `001-KP2ACIMAHI,Damar Tirta,081234567001,Jl. Sudirman No. 123,${currentDateIndo},aktif,Ketua,3273010101800001`,
          `002-KP2ACIMAHI,Artesis Cimindi Raya,081234567002,Jl. Ahmad Yani No. 456,${currentDateIndo},aktif,Bendahara,3273010201800002`
        ]
        break
      case 'loans':
        headers = ['id_anggota', 'nama_anggota', 'jumlah_pinjaman', 'sisa_pinjaman', 'tanggal_pinjam', 'jangka_waktu', 'bunga', 'status']
        filename = 'template-pinjaman.csv'
        sampleData = [
          `001-KP2ACIMAHI,Damar Tirta,10000000,5000000,${currentDateIndo},12,0,aktif`
        ]
        break
      case 'expenses':
        headers = ['tanggal', 'tipe', 'kategori', 'deskripsi', 'jumlah']
        filename = 'template-buku-kas.csv'
        sampleData = [
          `${currentDateIndo},debit,Operasional,Biaya listrik bulan ini,500000`,
          `${currentDateIndo},debit,ATK,Pembelian kertas dan tinta,250000`,
          `${currentDateIndo},kredit,Iuran Anggota,Penerimaan iuran bulan ini,1500000`,
          `${currentDateIndo},kredit,Simpanan,Setoran simpanan anggota,750000`
        ]
        break
      default:
        return
    }

    const csvContent = headers.join(',') + '\n' + sampleData.join('\n')
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

  const downloadDuesExcelTemplate = (currentYear: number) => {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Month headers
    const monthHeaders = ['id_anggota', 'nama_lengkap', 'tahun', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

    // Sample data for each sheet
    const sampleRows = [
      { id_anggota: '001-KP2ACIMAHI', nama_lengkap: 'Damar Tirta', tahun: currentYear, jan: 50000, feb: 50000, mar: 50000, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 },
      { id_anggota: '002-KP2ACIMAHI', nama_lengkap: 'Artesis Cimindi Raya', tahun: currentYear, jan: 50000, feb: 50000, mar: 50000, apr: 50000, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 },
      { id_anggota: '003-KP2ACIMAHI', nama_lengkap: 'Ahmad Rahman', tahun: currentYear, jan: 50000, feb: 0, mar: 50000, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 },
    ]

    // Sheet 1: Iuran Wajib
    const iuranWajibData = [
      monthHeaders,
      ...sampleRows.map(r => [r.id_anggota, r.nama_lengkap, r.tahun, r.jan, r.feb, r.mar, r.apr, r.may, r.jun, r.jul, r.aug, r.sep, r.oct, r.nov, r.dec])
    ]
    const wsIuranWajib = XLSX.utils.aoa_to_sheet(iuranWajibData)
    wsIuranWajib['!cols'] = [
      { wch: 18 }, // id_anggota
      { wch: 25 }, // nama_lengkap
      { wch: 8 },  // tahun
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(wb, wsIuranWajib, 'Iuran Wajib')

    // Sheet 2: Simpanan Wajib
    const simpananWajibData = [
      monthHeaders,
      ...sampleRows.map(r => [r.id_anggota, r.nama_lengkap, r.tahun, 25000, 25000, 25000, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    ]
    const wsSimpananWajib = XLSX.utils.aoa_to_sheet(simpananWajibData)
    wsSimpananWajib['!cols'] = wsIuranWajib['!cols']
    XLSX.utils.book_append_sheet(wb, wsSimpananWajib, 'Simpanan Wajib')

    // Sheet 3: Simpanan Sukarela
    const simpananSukarelaData = [
      monthHeaders,
      ...sampleRows.map(r => [r.id_anggota, r.nama_lengkap, r.tahun, 0, 10000, 0, 25000, 0, 0, 0, 0, 0, 0, 0, 0])
    ]
    const wsSimpananSukarela = XLSX.utils.aoa_to_sheet(simpananSukarelaData)
    wsSimpananSukarela['!cols'] = wsIuranWajib['!cols']
    XLSX.utils.book_append_sheet(wb, wsSimpananSukarela, 'Simpanan Sukarela')

    // Download file
    XLSX.writeFile(wb, `template-iuran-${currentYear}.xlsx`)
    toast.success('Template Excel dengan 3 sheet berhasil diunduh')
  }

  const getColumnHeaders = () => {
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) return []
    return Object.keys(parsedData.data[0])
  }

  const selectedDataType = dataTypes.find(dt => dt.id === dataType)!

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
    }
    return colors[color] || colors.blue
  }

  const formatInfo: Record<CSVDataType, { columns: string[] }> = {
    members: {
      columns: [
        'id_anggota: ID unik anggota (wajib)',
        'nama_lengkap: Nama lengkap anggota',
        'no_telepon: Nomor telepon',
        'alamat: Alamat lengkap',
        'tanggal_bergabung: Format DD/MM/YYYY',
        'status: aktif/nonaktif',
        'jabatan: Jabatan anggota',
        'nik: NIK (opsional)'
      ]
    },
    dues: {
      columns: [
        '📊 Format: Excel dengan 3 Sheet',
        '',
        '📄 Sheet 1: Iuran Wajib',
        '📄 Sheet 2: Simpanan Wajib',
        '📄 Sheet 3: Simpanan Sukarela',
        '',
        '📋 Kolom setiap sheet:',
        'id_anggota, nama_lengkap, tahun,',
        'Januari, Februari, Maret, April,',
        'Mei, Juni, Juli, Agustus,',
        'September, Oktober, November, Desember',
        '',
        '💡 Kosongkan bulan tanpa pembayaran'
      ]
    },
    loans: {
      columns: [
        'id_anggota: ID anggota peminjam (wajib)',
        'jumlah_pinjaman: Total pinjaman',
        'sisa_pinjaman: Sisa yang belum dibayar',
        'tanggal_pinjam: Format DD/MM/YYYY',
        'jangka_waktu: Tenor (bulan)',
        'bunga: Persentase bunga',
        'status: aktif/lunas'
      ]
    },
    expenses: {
      columns: [
        '📋 Format: CSV untuk Buku Kas',
        '',
        'tanggal: Format DD/MM/YYYY',
        'tipe: debit (pengeluaran) / kredit (pemasukan)',
        'kategori: Kategori transaksi',
        'deskripsi: Keterangan transaksi',
        'jumlah: Nominal (angka saja)',
        '',
        '💡 Contoh kategori:',
        'Debit: Operasional, ATK, Transport, dll',
        'Kredit: Iuran Anggota, Simpanan, dll'
      ]
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {dataTypes.map((dt) => {
          const isSelected = dataType === dt.id
          const colorClass = getColorClasses(dt.color)
          return (
            <motion.button
              key={dt.id}
              onClick={() => !file && setDataType(dt.id)}
              disabled={!!file}
              whileHover={{ scale: file ? 1 : 1.02 }}
              whileTap={{ scale: file ? 1 : 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                ? `${colorClass.bg} ${colorClass.border} ring-2 ring-offset-2 ring-${dt.color}-500`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${file ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? colorClass.badge : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <dt.icon className={`h-5 w-5 ${isSelected ? colorClass.icon : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {dt.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">{dt.description}</p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaCloudUploadAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Upload File CSV
            </h3>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : file
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
            >
              <input {...getInputProps()} />

              {isProcessing ? (
                <div className="py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Memproses file...</p>
                </div>
              ) : file ? (
                <div className="py-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <FaCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-lg">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(2)} KB • {parsedData?.data.length || 0} baris data</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); resetForm(); }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <FaTimes className="h-4 w-4" />
                    Hapus File
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <FaUpload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-lg">Drag & drop file CSV di sini</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">atau klik untuk memilih file</p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mengupload data...</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Result */}
            <AnimatePresence>
              {uploadResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-4 p-4 rounded-lg border ${uploadResult.failed === 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-700 dark:text-green-300">{uploadResult.success} berhasil</span>
                    </div>
                    {uploadResult.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <FaTimesCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-700 dark:text-red-300">{uploadResult.failed} gagal</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                <FaDownload className="h-4 w-4" />
                Download Template
              </button>

              <button
                onClick={handleUpload}
                disabled={!parsedData || isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mengupload...
                  </>
                ) : (
                  <>
                    <FaUpload className="h-4 w-4" />
                    Upload Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <AnimatePresence>
            {showPreview && parsedData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaTable className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Preview Data</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({Math.min(5, parsedData.data.length)} dari {parsedData.data.length} baris)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        {getColumnHeaders().map((header, i) => (
                          <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {previewData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {getColumnHeaders().map((header, colIndex) => (
                            <td key={colIndex} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Format Info Sidebar */}
        <div className="space-y-4">
          <div className={`rounded-xl border p-5 ${getColorClasses(selectedDataType.color).bg} ${getColorClasses(selectedDataType.color).border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-lg ${getColorClasses(selectedDataType.color).badge}`}>
                <selectedDataType.icon className={`h-5 w-5 ${getColorClasses(selectedDataType.color).icon}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedDataType.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDataType.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FaInfoCircle className="h-4 w-4" />
                Format Kolom:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                {formatInfo[dataType].columns.map((col, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <span>{col}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <FaInfoCircle className="h-4 w-4" />
              Tips Upload
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Gunakan template yang disediakan</li>
              <li>• Pastikan format tanggal sesuai</li>
              <li>• Periksa ID anggota sudah terdaftar</li>
              <li>• File maksimal 10.000 baris</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}