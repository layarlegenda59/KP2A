import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '../UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { FaPlus, FaPiggyBank, FaSearch, FaDollarSign, FaEdit, FaTrash, FaDownload, FaFilter, FaChevronLeft, FaChevronRight, FaSpinner, FaUsers, FaChartLine } from 'react-icons/fa';
import { Input } from '../UI/Input';
import SavingsDepositModal from './SavingsDepositModal';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useMemberSavings, SavingsFilters, PaginationOptions } from '../../hooks/useMemberSavings';
import { ErrorBoundary } from '../UI/ErrorBoundary';
import { SkeletonTable, ErrorDisplay, LoadingSpinner } from '../UI/LoadingStates';
import { AuthRequiredFallback } from '../UI/AuthRequiredFallback';

interface LocalFilter {
  minAmount: number;
  maxAmount: number;
  savingsType: 'all' | 'Simpanan Umum' | 'Simpanan Wajib' | 'Simpanan Sukarela';
}

const MemberSavingsTab: React.FC = () => {
  const { 
    savings,
    loading,
    error,
    totalCount,
    fetchSavings,
    deleteSaving,
    exportSavings,
    subscribeToSavings
  } = useMemberSavings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [editingSavings, setEditingSavings] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [localFilter, setLocalFilter] = useState<LocalFilter>({
    minAmount: 0,
    maxAmount: 0,
    savingsType: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewSavingModal, setShowNewSavingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Define loadData function with useCallback to prevent unnecessary re-renders
  const loadData = useCallback(() => {
    try {
      const filters: SavingsFilters = {};
      
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      if (localFilter.savingsType !== 'all') {
        filters.type = localFilter.savingsType;
      }

      const pagination: PaginationOptions = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (fetchSavings) {
        fetchSavings(filters, pagination);
      }
    } catch (error) {
      console.error('Error in loadData:', error);
      toast.error('Gagal memuat data simpanan');
    }
  }, [searchTerm, localFilter.savingsType, currentPage, itemsPerPage, fetchSavings]);

  // Load data on component mount and set up real-time subscription
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initializeData = async () => {
      try {
        if (mounted) {
          loadData();
        }
        
        if (subscribeToSavings && mounted) {
          unsubscribe = subscribeToSavings();
        }
      } catch (error) {
        if (mounted) {
          console.error('Error in initial data load:', error);
          toast.error('Gagal memuat data awal');
        }
      }
    };

    initializeData();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Remove loadData and subscribeToSavings from dependencies to prevent infinite loop

  // Reload data when filters or pagination change (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        loadData();
      } catch (error) {
        console.error('Error in data reload:', error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, localFilter.savingsType, currentPage]); // Only depend on actual filter values

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!savings || !Array.isArray(savings)) {
      return {
        totalOperational: 0,
        totalMandatory: 0,
        totalVoluntary: 0,
        grandTotal: 0,
        totalMembers: 0
      };
    }

    const totalOperational = savings
      .filter(s => s?.type === 'Simpanan Umum')
      .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
    
    const totalMandatory = savings
      .filter(s => s?.type === 'Simpanan Wajib')
      .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
    
    const totalVoluntary = savings
      .filter(s => s?.type === 'Simpanan Sukarela')
      .reduce((sum, s) => sum + Number(s?.amount || 0), 0);
    
    const grandTotal = totalOperational + totalMandatory + totalVoluntary;

    return {
      totalOperational,
      totalMandatory,
      totalVoluntary,
      grandTotal,
      activeMembers: new Set(savings.map(s => s.member_id)).size
    };
  }, [savings]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handler functions for modals - memoized to prevent unnecessary re-renders
  const handleCreateSaving = useCallback(async (data: any) => {
    try {
      // Handle creating new saving
      setShowNewSavingModal(false);
      toast.success('Simpanan berhasil ditambahkan');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error creating saving:', error);
      toast.error('Gagal menambahkan simpanan');
    }
  }, [loadData]);

  const handleEditSaving = useCallback(async (data: any) => {
    try {
      // Handle editing saving
      setShowEditModal(false);
      setEditingSavings(null);
      toast.success('Simpanan berhasil diperbarui');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error editing saving:', error);
      toast.error('Gagal memperbarui simpanan');
    }
  }, [loadData]);

  const handleEdit = useCallback((saving: any) => {
    setEditingSavings(saving);
    setIsDepositModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data simpanan ini?')) {
      try {
        await deleteSaving(id);
        toast.success('Data simpanan berhasil dihapus');
      } catch (error) {
        console.error('Failed to delete savings:', error);
      }
    }
  }, [deleteSaving]);

  const handleExportToExcel = useCallback(async () => {
    try {
      const filters: SavingsFilters = {};
      
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      if (localFilter.savingsType !== 'all') {
        filters.type = localFilter.savingsType;
      }

      const exportData = await exportSavings(filters);
      
      const csvContent = [
        ['Nama Anggota', 'ID Anggota', 'Jenis Simpanan', 'Jumlah', 'Deskripsi', 'Tanggal Transaksi'],
        ...exportData.map(item => [
          item.member?.nama_lengkap || '',
          item.member?.id_anggota || '',
          item.type,
          item.amount,
          item.description || '',
          item.transaction_date
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-simpanan-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Gagal mengekspor data');
    }
  }, [searchTerm, localFilter.savingsType, exportSavings]);

  const resetFilter = useCallback(() => {
    setLocalFilter({
      minAmount: 0,
      maxAmount: 0,
      savingsType: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsDepositModalOpen(false);
    setEditingSavings(null);
    // Refresh data after modal closes
    loadData();
  }, [loadData]);

  // Pagination handlers - memoized to prevent unnecessary re-renders
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  // Search handler with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Show loading state
  if (loading && savings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <FaSpinner className="w-5 h-5" />
              <span>Gagal memuat data simpanan: {error}</span>
            </div>
            <Button 
              onClick={loadData} 
              className="mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Memuat...
                </>
              ) : (
                'Coba Lagi'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Simpanan</p>
                  <div className="text-2xl font-bold text-blue-600">
                    {loading ? (
                      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      formatCurrency(summaryStats.grandTotal)
                    )}
                  </div>
                </div>
                <FaPiggyBank className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Anggota</p>
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? (
                      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      summaryStats.activeMembers
                    )}
                  </div>
                </div>
                <FaUsers className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rata-rata per Anggota</p>
                  <div className="text-2xl font-bold text-purple-600">
                    {loading ? (
                      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      formatCurrency(summaryStats.activeMembers > 0 ? summaryStats.grandTotal / summaryStats.activeMembers : 0)
                    )}
                  </div>
                </div>
                <FaChartLine className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header with Search and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center">
                <FaPiggyBank className="w-5 h-5 mr-2 text-blue-600" />
                Simpanan Anggota
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari anggota..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FaFilter className="w-4 h-4" />
                  Filter
                </Button>
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <FaDownload className="w-4 h-4" />
                  )}
                  Export CSV
                </Button>
                <Button
                  onClick={() => setShowNewSavingModal(true)}
                  className="flex items-center gap-2"
                >
                  <FaPlus className="w-4 h-4" />
                  Catat Simpanan
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Filter Panel */}
          {showFilters && (
            <CardContent className="border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type-filter">Jenis Simpanan</Label>
                  <Select
                    value={filters.type || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua jenis</SelectItem>
                      <SelectItem value="operasional">Operasional</SelectItem>
                      <SelectItem value="dana_pinjaman">Dana Pinjaman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date-from">Dari Tanggal</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="date-to">Sampai Tanggal</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                >
                  Reset Filter
                </Button>
                <Button onClick={() => setShowFilters(false)}>
                  Tutup
                </Button>
              </div>
            </CardContent>
          )}

          <CardContent>
            {error ? (
              // Check if it's an authentication/RLS error
              error.includes('login') || error.includes('Akses ditolak') || error.includes('Sesi') ? (
                <AuthRequiredFallback
                  title="Akses Data Simpanan Terbatas"
                  message="Anda perlu login untuk mengakses data simpanan anggota. Data ini dilindungi oleh sistem keamanan."
                  onLoginClick={() => {
                    toast.info('Mengarahkan ke halaman login...');
                    // Redirect to login page
                    window.location.href = '/login';
                  }}
                />
              ) : (
                <ErrorDisplay
                  title="Gagal Memuat Data Simpanan"
                  message={error}
                  onRetry={loadData}
                  showRetry={true}
                />
              )
            ) : loading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Anggota</th>
                        <th className="text-left p-3 font-medium">Jenis</th>
                        <th className="text-left p-3 font-medium">Jumlah</th>
                        <th className="text-left p-3 font-medium">Tanggal</th>
                        <th className="text-left p-3 font-medium">Keterangan</th>
                        <th className="text-left p-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Belum ada data simpanan
                          </td>
                        </tr>
                      ) : (
                        savings.map((saving) => (
                          <tr key={saving.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{saving.member?.nama_lengkap}</p>
                                <p className="text-sm text-gray-500">{saving.member?.nomor_anggota}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                saving.type === 'operasional' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {saving.type === 'operasional' ? 'Operasional' : 'Dana Pinjaman'}
                              </span>
                            </td>
                            <td className="p-3 font-medium">{formatCurrency(saving.amount)}</td>
                            <td className="p-3">{formatDate(saving.created_at)}</td>
                            <td className="p-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {saving.description || '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(saving)}
                                  className="flex items-center gap-1"
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(saving.id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                >
                                  <FaTrash className="w-3 h-3" />
                                  Hapus
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} data
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <FaChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm">
                        {currentPage} / {Math.ceil(totalCount / itemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                      >
                        <FaChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <SavingsDepositModal
          isOpen={showNewSavingModal}
          onClose={() => setShowNewSavingModal(false)}
          onSubmit={handleCreateSaving}
        />

        <SavingsDepositModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingSavings(null);
          }}
          editData={editingSavings}
          onSubmit={handleEditSaving}
        />
      </div>
    </ErrorBoundary>
  );
};

export default MemberSavingsTab;