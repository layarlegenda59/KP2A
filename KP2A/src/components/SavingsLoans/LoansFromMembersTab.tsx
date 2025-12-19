import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { FaPlus, FaHandHoldingUsd, FaSearch, FaCalendar, FaDollarSign, FaEdit, FaTrash, FaFilter, FaFileExport, FaBell, FaExclamationTriangle, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Input } from '../UI/Input';
import { AnimatedBadge } from '../UI/AnimatedComponents';
import NewLoanFromMemberModal from './NewLoanFromMemberModal';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { useLoansFromMembers, LoansFilters, PaginationOptions } from '../../hooks/useLoansFromMembers';

interface LocalFilter {
  status: 'all' | 'pending' | 'approved' | 'active' | 'completed' | 'overdue' | 'rejected';
  dueDateRange: 'all' | 'due_soon' | 'overdue' | '30_days';
  amountRange: 'all' | 'small' | 'medium' | 'large';
}

const LoansFromMembersTab: React.FC = () => {
  const {
    loans,
    loading,
    error,
    totalCount,
    fetchLoans,
    updateLoan,
    deleteLoan,
    getOverdueLoans,
    exportLoans,
    subscribeToLoans
  } = useLoansFromMembers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [localFilter, setLocalFilter] = useState<LocalFilter>({
    status: 'all',
    dueDateRange: 'all',
    amountRange: 'all'
  });
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);

  // Load data on component mount and set up real-time subscription
  useEffect(() => {
    loadData();
    loadOverdueLoans();
    const unsubscribe = subscribeToLoans();
    return unsubscribe;
  }, []);

  // Reload data when filters or pagination change
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, localFilter]);

  // Check for overdue loans periodically
  useEffect(() => {
    const interval = setInterval(loadOverdueLoans, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const filters: LoansFilters = {};

    if (searchTerm) {
      filters.search = searchTerm;
    }

    if (localFilter.status !== 'all') {
      filters.status = localFilter.status;
    }

    if (localFilter.amountRange !== 'all') {
      switch (localFilter.amountRange) {
        case 'small':
          filters.maxAmount = 3000000;
          break;
        case 'medium':
          filters.minAmount = 3000000;
          filters.maxAmount = 7000000;
          break;
        case 'large':
          filters.minAmount = 7000000;
          break;
      }
    }

    if (localFilter.dueDateRange !== 'all') {
      const today = new Date();
      switch (localFilter.dueDateRange) {
        case 'due_soon':
          const sevenDaysLater = new Date(today);
          sevenDaysLater.setDate(today.getDate() + 7);
          filters.dateTo = sevenDaysLater.toISOString().split('T')[0];
          break;
        case 'overdue':
          filters.dateTo = today.toISOString().split('T')[0];
          break;
        case '30_days':
          const thirtyDaysLater = new Date(today);
          thirtyDaysLater.setDate(today.getDate() + 30);
          filters.dateTo = thirtyDaysLater.toISOString().split('T')[0];
          break;
      }
    }

    const pagination: PaginationOptions = {
      page: currentPage,
      limit: itemsPerPage
    };

    fetchLoans(filters, pagination);
  };

  const loadOverdueLoans = async () => {
    try {
      const overdue = await getOverdueLoans();
      setOverdueLoans(overdue);

      // Show notification for overdue loans
      if (overdue.length > 0) {
        toast.error(`${overdue.length} pinjaman sudah terlambat!`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error loading overdue loans:', error);
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAmount = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
    const totalOutstanding = loans
      .filter(loan => loan.status === 'active' || loan.status === 'approved')
      .reduce((sum, loan) => sum + Number(loan.remaining_balance || loan.amount), 0);
    const totalPaid = loans
      .filter(loan => loan.status === 'completed')
      .reduce((sum, loan) => sum + Number(loan.amount), 0);
    const totalOverdue = loans
      .filter(loan => loan.status === 'overdue')
      .reduce((sum, loan) => sum + Number(loan.remaining_balance || loan.amount), 0);

    return {
      totalAmount,
      totalOutstanding,
      totalPaid,
      totalOverdue,
      totalLoans: loans.length,
      activeLoans: loans.filter(loan => loan.status === 'active').length,
      completedLoans: loans.filter(loan => loan.status === 'completed').length,
      overdueCount: loans.filter(loan => loan.status === 'overdue').length
    };
  }, [loans]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <AnimatedBadge variant="success">Lunas</AnimatedBadge>;
      case 'active':
        return <AnimatedBadge variant="info">Aktif</AnimatedBadge>;
      case 'approved':
        return <AnimatedBadge variant="warning">Disetujui</AnimatedBadge>;
      case 'overdue':
        return <AnimatedBadge variant="destructive">Terlambat</AnimatedBadge>;
      case 'pending':
        return <AnimatedBadge variant="secondary">Menunggu</AnimatedBadge>;
      case 'rejected':
        return <AnimatedBadge variant="destructive">Ditolak</AnimatedBadge>;
      default:
        return <AnimatedBadge variant="secondary">{status}</AnimatedBadge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEdit = (loan: any) => {
    setEditingLoan(loan);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (loanId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pinjaman ini?')) {
      try {
        await deleteLoan(loanId);
        toast.success('Pinjaman berhasil dihapus');
      } catch (error) {
        console.error('Error deleting loan:', error);
      }
    }
  };

  const handleMarkAsPaid = async (loanId: string) => {
    try {
      await updateLoan(loanId, {
        status: 'completed',
        remaining_balance: 0
      });
      toast.success('Pinjaman ditandai sebagai lunas');
    } catch (error) {
      console.error('Error updating loan:', error);
    }
  };

  const handleExportToCSV = async () => {
    try {
      const filters: LoansFilters = {};

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (localFilter.status !== 'all') {
        filters.status = localFilter.status;
      }

      const exportData = await exportLoans(filters);

      const csvContent = [
        ['Nama Anggota', 'ID Anggota', 'Jumlah', 'Suku Jasa', 'Durasi (Bulan)', 'Status', 'Tanggal Pinjaman', 'Jatuh Tempo', 'Sisa Saldo', 'Tujuan'],
        ...exportData.map(loan => [
          loan.member?.nama_lengkap || '',
          loan.member?.id_anggota || '',
          loan.amount,
          `${loan.interest_rate}%`,
          loan.duration_months,
          loan.status,
          loan.loan_date,
          loan.due_date,
          loan.remaining_balance || loan.amount,
          loan.purpose || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pinjaman_dari_anggota_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Gagal mengekspor data');
    }
  };

  const resetFilter = () => {
    setLocalFilter({
      status: 'all',
      dueDateRange: 'all',
      amountRange: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleModalClose = () => {
    setIsNewLoanModalOpen(false);
    setIsEditModalOpen(false);
    setEditingLoan(null);
    // Refresh data after modal closes
    loadData();
  };

  // Show loading state
  if (loading && loans.length === 0) {
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
              <span>Gagal memuat data pinjaman: {error}</span>
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
    <div className="space-y-6">
      {/* Notification Banner for Overdue Loans */}
      {summaryStats.overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">
                  Peringatan: {summaryStats.overdueCount} pinjaman sudah terlambat!
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Segera lakukan tindak lanjut untuk pinjaman yang sudah melewati jatuh tempo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pinjaman</CardTitle>
            <FaDollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summaryStats.totalAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">{summaryStats.totalLoans} pinjaman</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Belum Lunas</CardTitle>
            <FaHandHoldingUsd className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summaryStats.totalOutstanding)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {summaryStats.activeLoans} pinjaman aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <FaExclamationTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summaryStats.totalOverdue)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {summaryStats.overdueCount} pinjaman terlambat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Lunas</CardTitle>
            <FaHandHoldingUsd className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalPaid)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {summaryStats.completedLoans} pinjaman selesai
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search, Filter and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari nama atau ID anggota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FaFilter className="h-4 w-4" />
              Filter
            </Button>
            <Button
              variant="outline"
              onClick={handleExportToCSV}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <FaFileExport className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setIsNewLoanModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <FaPlus className="w-4 h-4 mr-2" />
          Catat Pinjaman Baru
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={localFilter.status}
                  onChange={(e) => setLocalFilter(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Lunas</option>
                  <option value="overdue">Terlambat</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Jatuh Tempo</label>
                <select
                  value={localFilter.dueDateRange}
                  onChange={(e) => setLocalFilter(prev => ({ ...prev, dueDateRange: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="all">Semua</option>
                  <option value="due_soon">Jatuh Tempo (7 hari)</option>
                  <option value="30_days">30 Hari ke Depan</option>
                  <option value="overdue">Terlambat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Jumlah Pinjaman</label>
                <select
                  value={localFilter.amountRange}
                  onChange={(e) => setLocalFilter(prev => ({ ...prev, amountRange: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="all">Semua Jumlah</option>
                  <option value="small">&lt; 3 Juta</option>
                  <option value="medium">3 - 7 Juta</option>
                  <option value="large">&gt; 7 Juta</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilter}
                  className="w-full"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                    Anggota
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-900 dark:text-white">
                    Jumlah
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Tanggal
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Jatuh Tempo
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Jasa
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="animate-pulse flex justify-center gap-2">
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500 dark:text-gray-400">
                      {searchTerm || localFilter.status !== 'all' || localFilter.dueDateRange !== 'all' || localFilter.amountRange !== 'all'
                        ? 'Tidak ada data yang sesuai dengan filter'
                        : 'Belum ada data pinjaman'}
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const daysUntilDue = getDaysUntilDue(loan.due_date);
                    const isOverdue = daysUntilDue < 0 && loan.status !== 'completed';
                    const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0 && loan.status !== 'completed';

                    return (
                      <tr
                        key={loan.id}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isOverdue ? 'bg-red-50 dark:bg-red-900/10' :
                            isDueSoon ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                          }`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {loan.member?.nama_lengkap || 'Unknown Member'}
                            {isOverdue && <FaBell className="inline ml-2 h-3 w-3 text-red-500" />}
                            {isDueSoon && <FaBell className="inline ml-2 h-3 w-3 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {loan.member?.id_anggota || 'N/A'}
                          </div>
                          {loan.purpose && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {loan.purpose}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-blue-600">
                            {formatCurrency(Number(loan.amount))}
                          </div>
                          {loan.remaining_balance && loan.remaining_balance !== loan.amount && (
                            <div className="text-sm text-gray-500">
                              Sisa: {formatCurrency(Number(loan.remaining_balance))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                          {new Date(loan.loan_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                            {new Date(loan.due_date).toLocaleDateString('id-ID')}
                          </div>
                          {loan.status !== 'completed' && (
                            <div className={`text-xs mt-1 ${isOverdue ? 'text-red-500' :
                                isDueSoon ? 'text-yellow-600' : 'text-gray-500'
                              }`}>
                              {isOverdue
                                ? `Terlambat ${Math.abs(daysUntilDue)} hari`
                                : daysUntilDue <= 30
                                  ? `${daysUntilDue} hari lagi`
                                  : `${daysUntilDue} hari lagi`
                              }
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {getStatusBadge(loan.status)}
                        </td>
                        <td className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                          {loan.interest_rate ? `${loan.interest_rate}%` : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(loan)}
                              className="p-2"
                            >
                              <FaEdit className="h-3 w-3" />
                            </Button>
                            {loan.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsPaid(loan.id)}
                                className="p-2 text-green-600 hover:text-green-700"
                                title="Tandai sebagai lunas"
                              >
                                ✓
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(loan.id)}
                              className="p-2 text-red-600 hover:text-red-700"
                            >
                              <FaTrash className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} data
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              <FaChevronLeft className="w-3 h-3" />
            </Button>

            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <FaChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* New Loan Modal */}
      <NewLoanFromMemberModal
        isOpen={isNewLoanModalOpen}
        onClose={handleModalClose}
      />

      {/* Edit Loan Modal */}
      <NewLoanFromMemberModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        editData={editingLoan}
        isEditMode={true}
      />
    </div>
  );
};

export default LoansFromMembersTab;