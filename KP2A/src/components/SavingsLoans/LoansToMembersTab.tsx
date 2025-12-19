import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { FaPlus, FaCreditCard, FaSearch, FaDollarSign, FaArrowUp, FaExclamationTriangle, FaCalendar, FaEdit, FaTrash, FaFileContract, FaHistory, FaFilter, FaDownload, FaChevronLeft, FaChevronRight, FaEye, FaTimes, FaSpinner } from 'react-icons/fa';
import { Input } from '../UI/Input';
import { AnimatedBadge } from '../UI/AnimatedComponents';
import { LoanToMember } from '../../types/savingsLoans';
import NewLoanToMemberModal from './NewLoanToMemberModal';
import LoanInstallmentModal from './LoanInstallmentModal';
import toast from 'react-hot-toast';
import { useLoans } from '../../hooks/useSavingsLoans';

// Enhanced mock data dengan data yang lebih lengkap
const mockLoansToData: LoanToMember[] = [
  {
    id: '1',
    borrowerId: 'M001',
    borrowerName: 'Ahmad Suryadi',
    loanAmount: 10000000,
    totalInstallments: 12,
    paidInstallments: 8,
    remainingAmount: 3500000,
    status: 'aktif',
    startDate: new Date('2023-06-01'),
    dueDate: new Date('2024-06-01'),
    interestRate: 2,
    monthlyInstallment: 875000,
    nextDueDate: new Date('2024-02-01'),
    purpose: 'Modal usaha',
    guarantor: 'Siti Nurhaliza'
  },
  {
    id: '2',
    borrowerId: 'M002',
    borrowerName: 'Siti Nurhaliza',
    loanAmount: 5000000,
    totalInstallments: 10,
    paidInstallments: 10,
    remainingAmount: 0,
    status: 'lunas',
    startDate: new Date('2023-04-01'),
    dueDate: new Date('2024-02-01'),
    interestRate: 1.5,
    monthlyInstallment: 525000,
    nextDueDate: null,
    purpose: 'Renovasi rumah',
    guarantor: 'Ahmad Suryadi'
  },
  {
    id: '3',
    borrowerId: 'M003',
    borrowerName: 'Budi Santoso',
    loanAmount: 15000000,
    totalInstallments: 24,
    paidInstallments: 18,
    remainingAmount: 4000000,
    status: 'menunggak',
    startDate: new Date('2022-12-01'),
    dueDate: new Date('2024-12-01'),
    interestRate: 2.5,
    monthlyInstallment: 650000,
    nextDueDate: new Date('2024-01-15'),
    purpose: 'Pendidikan anak',
    guarantor: 'Dewi Sartika'
  },
  {
    id: '4',
    borrowerId: 'M004',
    borrowerName: 'Dewi Sartika',
    loanAmount: 8000000,
    totalInstallments: 18,
    paidInstallments: 12,
    remainingAmount: 3200000,
    status: 'aktif',
    startDate: new Date('2023-08-01'),
    dueDate: new Date('2025-02-01'),
    interestRate: 2,
    monthlyInstallment: 480000,
    nextDueDate: new Date('2024-02-01'),
    purpose: 'Kesehatan',
    guarantor: 'Budi Santoso'
  },
  {
    id: '5',
    borrowerId: 'M005',
    borrowerName: 'Eko Prasetyo',
    loanAmount: 12000000,
    totalInstallments: 36,
    paidInstallments: 24,
    remainingAmount: 4800000,
    status: 'aktif',
    startDate: new Date('2022-02-01'),
    dueDate: new Date('2025-02-01'),
    interestRate: 1.8,
    monthlyInstallment: 380000,
    nextDueDate: new Date('2024-02-01'),
    purpose: 'Kendaraan',
    guarantor: 'Ahmad Suryadi'
  }
];

// Interface untuk filter
interface LoanFilter {
  status: string;
  purpose: string;
  amountRange: string;
  dateRange: string;
}

const LoansToMembersTab: React.FC = () => {
  const { loans, loading, error, loadLoans, createLoan, updateLoan, deleteLoan } = useLoans();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [editLoan, setEditLoan] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<any | null>(null);

  // Filter state
  const [filters, setFilters] = useState<LoanFilter>({
    status: '',
    purpose: '',
    amountRange: '',
    dateRange: ''
  });

  // Notifikasi untuk pinjaman yang akan jatuh tempo
  useEffect(() => {
    if (!mockLoansToData || mockLoansToData.length === 0) return;

    const upcomingDueLoans = mockLoansToData.filter(loan => {
      if (!loan.nextDueDate || loan.status === 'lunas') return false;
      const daysUntilDue = Math.ceil((new Date(loan.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue > 0;
    });

    if (upcomingDueLoans.length > 0) {
      toast(`${upcomingDueLoans.length} pinjaman akan jatuh tempo dalam 7 hari`, {
        duration: 5000
      });
    }
  }, []);

  const filteredData = (mockLoansToData || []).filter(loan => {
    const memberName = loan.borrowerName || '';
    const memberId = loan.borrowerId || '';
    const matchesSearch = memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memberId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filters.status || loan.status === filters.status;
    const matchesPurpose = !filters.purpose || loan.purpose?.toLowerCase().includes(filters.purpose.toLowerCase());

    let matchesAmount = true;
    if (filters.amountRange) {
      const [min, max] = filters.amountRange.split('-').map(Number);
      matchesAmount = loan.loanAmount >= min && (!max || loan.loanAmount <= max);
    }

    return matchesSearch && matchesStatus && matchesPurpose && matchesAmount;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-blue-100 text-blue-800', text: 'Aktif' },
      'overdue': { color: 'bg-red-100 text-red-800', text: 'Terlambat' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Lunas' },
      'defaulted': { color: 'bg-yellow-100 text-yellow-800', text: 'Menunggak' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['active'];
    return (
      <AnimatedBadge className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </AnimatedBadge>
    );
  };

  const getProgressPercentage = (paid: number, total: number) => {
    return Math.round((paid / total) * 100);
  };

  const getDaysUntilDue = (dueDate: Date | null) => {
    if (!dueDate) return null;
    const days = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleEdit = (loan: any) => {
    setEditLoan(loan);
    setIsEditMode(true);
    setIsNewLoanModalOpen(true);
  };

  const handleDelete = async (loanId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pinjaman ini?')) {
      try {
        await deleteLoanToMember(loanId);
        toast.success('Pinjaman berhasil dihapus');
      } catch (error) {
        toast.error('Gagal menghapus pinjaman');
      }
    }
  };

  const handleInstallmentClick = (loanId: string) => {
    setSelectedLoanId(loanId);
    setIsInstallmentModalOpen(true);
  };

  const generateLoanSchedule = (loan: any) => {
    const schedule = [];
    const monthlyPayment = loan.monthlyInstallment || 0;
    let remainingBalance = loan.loanAmount;

    for (let i = 1; i <= loan.totalInstallments; i++) {
      const interestPayment = remainingBalance * (loan.interestRate / 100 / 12);
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNumber: i,
        dueDate,
        monthlyPayment,
        principalPayment,
        interestPayment,
        remainingBalance: Math.max(0, remainingBalance),
        isPaid: i <= (loan.paidInstallments || 0)
      });
    }

    return schedule;
  };

  const printLoanAgreement = (loan: any) => {
    const schedule = generateLoanSchedule(loan);
    const memberName = loan.member?.nama_lengkap || '';
    const memberId = loan.member?.id_anggota || '';

    const agreementContent = `
      SURAT PERJANJIAN PINJAMAN
      
      Nomor: ${loan.id}/KP2A/${new Date().getFullYear()}
      
      Pemberi Pinjaman: KP2A Cimahi
      Penerima Pinjaman: ${memberName} (${memberId})
      
      DETAIL PINJAMAN:
      - Jumlah Pinjaman: ${formatCurrency(loan.amount)}
      - Tingkat Jasa: ${loan.interest_rate}% per tahun
      - Jangka Waktu: ${loan.installment_count} bulan
      - Angsuran Bulanan: ${formatCurrency(loan.installment_amount || 0)}
      - Catatan: ${loan.notes || '-'}
      
      JADWAL ANGSURAN:
      ${schedule.map(s =>
      `${s.installmentNumber}. ${s.dueDate.toLocaleDateString('id-ID')} - ${formatCurrency(s.monthlyPayment)}`
    ).join('\n')}
      
      Tanggal: ${new Date().toLocaleDateString('id-ID')}
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Surat Perjanjian Pinjaman</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <pre>${agreementContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nama Peminjam', 'Jumlah Pinjaman', 'Angsuran Dibayar', 'Total Angsuran', 'Sisa Pinjaman', 'Status', 'Tanggal Mulai', 'Jatuh Tempo', 'Jasa', 'Catatan'];
    const csvData = filteredData.map(loan => [
      loan.id,
      loan.borrowerName || '',
      loan.loanAmount,
      loan.paidInstallments || 0,
      loan.totalInstallments,
      loan.remainingAmount || loan.loanAmount,
      loan.status,
      new Date(loan.startDate).toLocaleDateString('id-ID'),
      loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString('id-ID') : '-',
      `${loan.interestRate}%`,
      loan.purpose || '-'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pinjaman-ke-anggota-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalLoanAmount = (mockLoansToData || []).reduce((sum, loan) => sum + loan.loanAmount, 0);
  const totalRemaining = (mockLoansToData || []).reduce((sum, loan) => sum + (loan.remainingAmount || loan.loanAmount), 0);
  const totalPaid = totalLoanAmount - totalRemaining;
  const activeLoans = (mockLoansToData || []).filter(loan => loan.status === 'aktif' || loan.status === 'menunggak').length;
  const overdueLoans = (mockLoansToData || []).filter(loan => loan.status === 'menunggak').length;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin h-8 w-8 text-orange-600 mr-3" />
          <span className="text-gray-600">Memuat data pinjaman...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">Error: {error}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pinjaman</CardTitle>
            <FaDollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalLoanAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">{(mockLoansToData || []).length} pinjaman</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
            <FaArrowUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((totalPaid / totalLoanAmount) * 100)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Pinjaman</CardTitle>
            <FaCreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((totalRemaining / totalLoanAmount) * 100)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pinjaman Aktif</CardTitle>
            <FaExclamationTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{activeLoans}</div>
            <p className="text-xs text-gray-500 mt-1">
              {overdueLoans} menunggak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search, Filters and Action Buttons */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari nama/ID peminjam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <FaFilter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <FaDownload className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditLoan(null);
                setIsEditMode(false);
                setIsNewLoanModalOpen(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Catat Pinjaman Baru
            </Button>
            <Button
              onClick={() => handleInstallmentClick('')}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <FaCreditCard className="w-4 h-4 mr-2" />
              Catat Angsuran
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="completed">Lunas</option>
                    <option value="overdue">Terlambat</option>
                    <option value="defaulted">Menunggak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
                  <input
                    type="text"
                    value={filters.purpose}
                    onChange={(e) => setFilters(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Cari tujuan pinjaman..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pinjaman</label>
                  <select
                    value={filters.amountRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Semua Jumlah</option>
                    <option value="0-5000000">&lt; 5 Juta</option>
                    <option value="5000000-10000000">5 - 10 Juta</option>
                    <option value="10000000-20000000">10 - 20 Juta</option>
                    <option value="20000000-999999999">&gt; 20 Juta</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => setFilters({ status: '', purpose: '', amountRange: '', dateRange: '' })}
                    variant="outline"
                    className="w-full"
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                    Nama Peminjam
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-900 dark:text-white">
                    Jumlah Pinjaman
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Progress Angsuran
                  </th>
                  <th className="text-right p-4 font-semibold text-gray-900 dark:text-white">
                    Sisa Pinjaman
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-900 dark:text-white">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400">
                      {searchTerm || Object.values(filters).some(f => f) ? 'Tidak ada data yang sesuai dengan pencarian/filter' : 'Belum ada data pinjaman'}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((loan) => {
                    const progressPercentage = getProgressPercentage(loan.paidInstallments || 0, loan.totalInstallments);
                    const daysUntilDue = loan.nextDueDate ? getDaysUntilDue(new Date(loan.nextDueDate)) : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                    const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0;
                    const memberName = loan.borrowerName || '';
                    const memberId = loan.borrowerId || '';

                    return (
                      <tr
                        key={loan.id}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' :
                            isDueSoon ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                          }`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {memberName}
                            {isOverdue && <span className="ml-2 text-red-600 text-xs">⚠️ TERLAMBAT</span>}
                            {isDueSoon && <span className="ml-2 text-yellow-600 text-xs">⏰ JATUH TEMPO</span>}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {memberId} | {loan.notes || 'Tidak ada catatan'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Jasa: {loan.interestRate}% | Mulai: {new Date(loan.startDate).toLocaleDateString('id-ID')}
                            {loan.nextDueDate && (
                              <span className="ml-2">
                                | Jatuh Tempo: {new Date(loan.nextDueDate).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-blue-600">
                          {formatCurrency(loan.loanAmount)}
                          <div className="text-xs text-gray-500 mt-1">
                            {formatCurrency(loan.monthlyInstallment || 0)}/bulan
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {loan.paidInstallments || 0} / {loan.totalInstallments}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${loan.status === 'completed' ? 'bg-green-600' :
                                  loan.status === 'overdue' || loan.status === 'defaulted' ? 'bg-red-600' : 'bg-blue-600'
                                }`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {progressPercentage}%
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-orange-600">
                          {formatCurrency(loan.remainingAmount || loan.loanAmount)}
                        </td>
                        <td className="p-4 text-center">
                          {getStatusBadge(loan.status)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLoanForDetails(loan)}
                              className="text-xs"
                              title="Lihat Detail"
                            >
                              <FaEye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(loan)}
                              className="text-xs"
                              title="Edit"
                            >
                              <FaEdit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printLoanAgreement(loan)}
                              className="text-xs"
                              title="Cetak Surat"
                            >
                              <FaFileContract className="w-3 h-3" />
                            </Button>
                            {loan.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInstallmentClick(loan.id)}
                                className="text-xs"
                                title="Bayar Angsuran"
                              >
                                <FaCreditCard className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(loan.id)}
                              className="text-xs text-red-600 hover:bg-red-50"
                              title="Hapus"
                            >
                              <FaTrash className="w-3 h-3" />
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
          <div className="text-sm text-gray-500">
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} data
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <FaChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <FaChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loan Details Modal */}
      {selectedLoanForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Detail Pinjaman - {selectedLoanForDetails.member?.nama_lengkap || ''}
              </h2>
              <button
                onClick={() => setSelectedLoanForDetails(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Informasi Peminjam</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Nama:</span> {selectedLoanForDetails.member?.nama_lengkap || ''}</div>
                    <div><span className="font-medium">ID:</span> {selectedLoanForDetails.member?.id_anggota || ''}</div>
                    <div><span className="font-medium">Alamat:</span> {selectedLoanForDetails.member?.alamat || '-'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Detail Pinjaman</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Jumlah:</span> {formatCurrency(selectedLoanForDetails.amount)}</div>
                    <div><span className="font-medium">Jasa:</span> {selectedLoanForDetails.interest_rate}% per tahun</div>
                    <div><span className="font-medium">Catatan:</span> {selectedLoanForDetails.notes || '-'}</div>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Jadwal Angsuran</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Ke-</th>
                      <th className="text-left p-2">Tanggal</th>
                      <th className="text-right p-2">Angsuran</th>
                      <th className="text-right p-2">Pokok</th>
                      <th className="text-right p-2">Jasa</th>
                      <th className="text-right p-2">Sisa</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generateLoanSchedule(selectedLoanForDetails).map((schedule, index) => (
                      <tr key={index} className={`border-b ${schedule.isPaid ? 'bg-green-50' : ''}`}>
                        <td className="p-2">{schedule.installmentNumber}</td>
                        <td className="p-2">{schedule.dueDate.toLocaleDateString('id-ID')}</td>
                        <td className="p-2 text-right">{formatCurrency(schedule.monthlyPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(schedule.principalPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(schedule.interestPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(schedule.remainingBalance)}</td>
                        <td className="p-2 text-center">
                          {schedule.isPaid ? (
                            <span className="text-green-600">✓ Lunas</span>
                          ) : (
                            <span className="text-gray-500">Belum</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Loan Modal */}
      <NewLoanToMemberModal
        isOpen={isNewLoanModalOpen}
        onClose={() => {
          setIsNewLoanModalOpen(false);
          setEditLoan(null);
          setIsEditMode(false);
        }}

        editData={editLoan}
        isEditMode={isEditMode}
      />

      {/* Installment Modal */}
      <LoanInstallmentModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        loanId={selectedLoanId}
        onSubmit={(installmentData) => {
          // Handle installment submission
          const loan = mockLoansToData?.find(l => l.id === installmentData.loanId);
          if (loan) {
            // This would be handled by the hook in a real implementation
            toast.success('Angsuran berhasil dicatat');
          }
          setIsInstallmentModalOpen(false);
        }}
      />
    </div>
  );
};



export default LoansToMembersTab;