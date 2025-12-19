import { useEffect, useMemo, useState } from 'react'
import { FaPlus, FaSearch, FaFilter, FaPencilAlt, FaTrash, FaTimes, FaExclamationTriangle, FaArrowDown, FaArrowUp, FaBook, FaWallet, FaExchangeAlt, FaCheck } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { expensesApi } from '../../lib/api'
import { CashBookForm, CashBookFormValues } from './CashBookForm'

interface CashBookItem {
  id: string
  type: 'debit' | 'credit'
  kategori: string
  deskripsi: string
  jumlah: number
  tanggal: string
  status_otorisasi: 'pending' | 'paid' | 'overdue'
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue'
type TypeFilter = 'all' | 'debit' | 'credit'

export function CashBookPage() {
  const [items, setItems] = useState<CashBookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CashBookItem | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [defaultTransactionType, setDefaultTransactionType] = useState<'debit' | 'credit'>('debit')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data, error } = await expensesApi.getAll()
      if (error) throw new Error(error)

      const items = data || []
      const normalized = items.map((d: any) => {
        let status = d.status_otorisasi || d.status || 'pending'
        if (!['pending', 'paid', 'overdue'].includes(status)) {
          status = 'pending'
        }
        return {
          id: d.id,
          type: (d.type as 'debit' | 'credit') || 'debit',
          kategori: d.kategori || d.expense_categories?.name || 'Unknown',
          deskripsi: d.deskripsi || d.notes || '',
          jumlah: Number(d.jumlah || d.amount),
          tanggal: d.tanggal || d.payment_date,
          status_otorisasi: status as 'pending' | 'paid' | 'overdue',
        }
      })
      // Sort by date descending (newest first)
      normalized.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      setItems(normalized)
    } catch (err) {
      console.error('Failed to fetch cash book items:', err)
      setItems([])
      toast((_) => (
        <div className="flex items-start">
          <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Gagal memuat Buku Kas</p>
            <p className="text-xs text-gray-600">Terjadi kesalahan pada server</p>
          </div>
        </div>
      ))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchStatus = statusFilter === 'all' ? true : item.status_otorisasi === statusFilter
      const matchType = typeFilter === 'all' ? true : item.type === typeFilter
      const matchSearch = q ? `${item.deskripsi} ${item.kategori}`.toLowerCase().includes(q) : true
      return matchStatus && matchType && matchSearch
    })
  }, [items, search, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const handleCreate = async (values: CashBookFormValues) => {
    const payload = {
      type: values.type,
      kategori: values.kategori,
      deskripsi: values.deskripsi,
      jumlah: values.jumlah,
      tanggal: values.tanggal,
      status_otorisasi: values.status_otorisasi,
    }

    try {
      const { data, error } = await expensesApi.create(payload as any)
      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const newItem: CashBookItem = {
        id: data.id,
        type: values.type,
        kategori: data.kategori || values.kategori,
        deskripsi: data.deskripsi || values.deskripsi,
        jumlah: Number(data.jumlah || values.jumlah),
        tanggal: data.tanggal || values.tanggal,
        status_otorisasi: (data.status_otorisasi || values.status_otorisasi || 'pending') as 'pending' | 'paid' | 'overdue',
      }

      setItems((prev) => [newItem, ...prev])
      toast.success(values.type === 'debit' ? 'Pengeluaran berhasil disimpan' : 'Pemasukan berhasil disimpan')
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan transaksi')
    }
  }

  const handleUpdate = async (id: string, values: Partial<CashBookFormValues>) => {
    try {
      const payload: any = {}
      if (values.type !== undefined) payload.type = values.type
      if (values.kategori !== undefined) payload.kategori = values.kategori
      if (values.deskripsi !== undefined) payload.deskripsi = values.deskripsi
      if (values.jumlah !== undefined) payload.jumlah = values.jumlah
      if (values.tanggal !== undefined) payload.tanggal = values.tanggal
      if (values.status_otorisasi !== undefined) payload.status_otorisasi = values.status_otorisasi

      const { data, error } = await expensesApi.update(id, payload)
      if (error) throw new Error(error)
      if (!data) throw new Error('No data returned')

      const dataType = (data as any).type || 'debit'
      const updatedItem: CashBookItem = {
        id: data.id,
        type: (values.type || dataType) as 'debit' | 'credit',
        kategori: data.kategori || values.kategori || 'Unknown',
        deskripsi: data.deskripsi || values.deskripsi || '',
        jumlah: Number(data.jumlah || values.jumlah),
        tanggal: data.tanggal || values.tanggal || '',
        status_otorisasi: (data.status_otorisasi || values.status_otorisasi || 'pending') as 'pending' | 'paid' | 'overdue',
      }

      setItems((prev) => prev.map((e) => (e.id === id ? updatedItem : e)))
      toast.success('Transaksi berhasil diperbarui')
      setEditing(null)
      setShowForm(false)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui transaksi')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await expensesApi.delete(id)
      if (error) throw new Error(error)

      setItems((prev) => prev.filter((e) => e.id !== id))
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('Transaksi berhasil dihapus')
      setConfirmDeleteId(null)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus transaksi')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      const idsArray = Array.from(selectedIds)
      await Promise.all(idsArray.map(id => expensesApi.delete(id)))
      setItems((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setSelectedIds(new Set())
      toast.success(`${idsArray.length} transaksi berhasil dihapus`)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus transaksi')
    } finally {
      setConfirmBulkDelete(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === pageItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pageItems.map(item => item.id)))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const isAllSelected = pageItems.length > 0 && selectedIds.size === pageItems.length
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < pageItems.length

  const getStatusBadge = (status: StatusFilter) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusLabel = (status: StatusFilter) => {
    switch (status) {
      case 'paid':
        return 'Sudah Bayar'
      case 'pending':
        return 'Menunggu'
      case 'overdue':
        return 'Terlambat'
      default:
        return status
    }
  }

  const getTypeBadge = (type: 'debit' | 'credit') => {
    return type === 'debit'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
  }

  const getTypeLabel = (type: 'debit' | 'credit') => {
    return type === 'debit' ? '📤 Debit' : '📥 Kredit'
  }

  // Summary stats - exclude bank transfer transactions from balance calculation
  // "Tarik Kas Bank", "Penarikan Uang dari BJB", etc. are internal transfers, not income
  const bankTransferKeywords = ['tarik kas bank', 'penarikan uang dari bjb', 'transfer bank', 'setor bank', 'tarik bank']

  const isInternalTransfer = (kategori: string) => {
    const lowerKategori = kategori.toLowerCase().trim()
    return bankTransferKeywords.some(keyword => lowerKategori.includes(keyword))
  }

  // Total Debit (pengeluaran) - exclude bank transfers
  const totalDebit = useMemo(() => items.filter(i => i.type === 'debit' && !isInternalTransfer(i.kategori)).reduce((sum, i) => sum + i.jumlah, 0), [items])

  // Total Credit (pemasukan) - exclude bank transfers  
  const totalCredit = useMemo(() => items.filter(i => i.type === 'credit' && !isInternalTransfer(i.kategori)).reduce((sum, i) => sum + i.jumlah, 0), [items])

  // Real balance = pemasukan riil - pengeluaran riil
  const balance = totalCredit - totalDebit

  // Tab configuration
  const tabs = [
    { id: 'all', label: 'Semua Transaksi', icon: FaBook, count: items.length },
    { id: 'credit', label: 'Kredit (Pemasukan)', icon: FaArrowUp, count: items.filter(i => i.type === 'credit').length },
    { id: 'debit', label: 'Debit (Pengeluaran)', icon: FaArrowDown, count: items.filter(i => i.type === 'debit').length },
  ]

  const openFormWithType = (type: 'debit' | 'credit') => {
    setDefaultTransactionType(type)
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header Stats - Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Credit */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-5 border border-green-200 dark:border-green-800 shadow-sm cursor-pointer"
          onClick={() => setTypeFilter('credit')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">Total Pemasukan</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                Rp {totalCredit.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {items.filter(i => i.type === 'credit' && !isInternalTransfer(i.kategori)).length} transaksi (excl. transfer bank)
              </p>
            </div>
            <div className="bg-green-200 dark:bg-green-800 p-3 rounded-lg">
              <FaArrowUp className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
          </div>
        </motion.div>

        {/* Total Debit */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-xl p-5 border border-red-200 dark:border-red-800 shadow-sm cursor-pointer"
          onClick={() => setTypeFilter('debit')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                Rp {totalDebit.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {items.filter(i => i.type === 'debit' && !isInternalTransfer(i.kategori)).length} transaksi (excl. transfer bank)
              </p>
            </div>
            <div className="bg-red-200 dark:bg-red-800 p-3 rounded-lg">
              <FaArrowDown className="h-6 w-6 text-red-600 dark:text-red-300" />
            </div>
          </div>
        </motion.div>

        {/* Balance */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`rounded-xl p-5 border shadow-sm cursor-pointer ${balance >= 0
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800'
            : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800'
            }`}
          onClick={() => setTypeFilter('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={balance >= 0 ? 'text-blue-700 dark:text-blue-300 text-sm font-medium' : 'text-orange-700 dark:text-orange-300 text-sm font-medium'}>
                Saldo Buku Kas
              </p>
              <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-orange-900 dark:text-orange-100'
                }`}>
                {balance >= 0 ? '+' : '-'} Rp {Math.abs(balance).toLocaleString('id-ID')}
              </p>
              <p className={`text-xs mt-1 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {balance >= 0 ? 'Surplus' : 'Defisit'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${balance >= 0 ? 'bg-blue-200 dark:bg-blue-800' : 'bg-orange-200 dark:bg-orange-800'
              }`}>
              <FaWallet className={`h-6 w-6 ${balance >= 0 ? 'text-blue-600 dark:text-blue-300' : 'text-orange-600 dark:text-orange-300'}`} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setTypeFilter(tab.id as TypeFilter); setPage(1) }}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${typeFilter === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${typeFilter === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search & Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari transaksi..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1) }}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="paid">Sudah Bayar</option>
                <option value="overdue">Terlambat</option>
              </select>
            </div>
          </div>

          {/* Add Buttons */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium shadow-sm transition-all"
              >
                <FaTrash className="h-4 w-4" /> Hapus {selectedIds.size}
              </button>
            )}
            <button
              onClick={() => openFormWithType('credit')}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm transition-all"
            >
              <FaArrowUp className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Pemasukan</span>
              <span className="sm:hidden">Kredit</span>
            </button>
            <button
              onClick={() => openFormWithType('debit')}
              className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium shadow-sm transition-all"
            >
              <FaArrowDown className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Pengeluaran</span>
              <span className="sm:hidden">Debit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <button
                    onClick={handleSelectAll}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isAllSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isPartiallySelected
                        ? 'bg-blue-100 border-blue-600 text-blue-600'
                        : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {isAllSelected && <FaCheck className="h-3 w-3" />}
                    {isPartiallySelected && !isAllSelected && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Deskripsi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length > 0 ? (
                pageItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectItem(item.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(item.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                          }`}
                      >
                        {selectedIds.has(item.id) && <FaCheck className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getTypeBadge(item.type)}`}>
                        {item.type === 'credit' ? <FaArrowUp className="h-3 w-3" /> : <FaArrowDown className="h-3 w-3" />}
                        {item.type === 'credit' ? 'Kredit' : 'Debit'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{item.kategori}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{item.deskripsi}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${item.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                      {item.type === 'debit' ? '-' : '+'} Rp {item.jumlah.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status_otorisasi)}`}>
                        {getStatusLabel(item.status_otorisasi)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(item); setShowForm(true) }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaPencilAlt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FaExchangeAlt className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Tidak ada transaksi</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Mulai tambahkan transaksi baru</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Baris per halaman:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1">
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>
                {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`} dari {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">Sebelumnya</button>
              <span className="text-sm text-gray-600 dark:text-gray-300 px-2">Halaman {page} dari {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">Selanjutnya</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowForm(false); setEditing(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  {editing ? (
                    <FaPencilAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : defaultTransactionType === 'credit' ? (
                    <FaArrowUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <FaArrowDown className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {editing ? 'Edit Transaksi' : defaultTransactionType === 'credit' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
                  </h3>
                </div>
                <button
                  onClick={() => { setShowForm(false); setEditing(null) }}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <CashBookForm
                  initial={editing || { type: defaultTransactionType } as any}
                  onCancel={() => { setShowForm(false); setEditing(null) }}
                  onSubmit={async (values) => {
                    if (editing) {
                      await handleUpdate(editing.id, values)
                    } else {
                      await handleCreate(values)
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hapus Transaksi?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan. Data transaksi akan dihapus secara permanen.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors">Batal</button>
                  <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors">Hapus Transaksi</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmBulkDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hapus {selectedIds.size} Transaksi?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors">Batal</button>
                  <button onClick={handleBulkDelete} className="px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors">Hapus {selectedIds.size} Item</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
