import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import { 
  FaPiggyBank, 
  FaHandHoldingUsd, 
  FaChartLine, 
  FaExclamationTriangle,
  FaUsers,
  FaMoneyBillWave,
  FaRefresh
} from 'react-icons/fa';
import { useAnalytics, useLoans } from '../../hooks/useSavingsLoans';
import { formatCurrency } from '../../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const { 
    savingsAnalytics, 
    loansAnalytics, 
    loading, 
    error, 
    loadAnalytics 
  } = useAnalytics();
  
  const { overdueLoans } = useLoans();

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Analytics
          </h2>
          <Button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            <FaRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <FaExclamationTriangle className="w-5 h-5" />
              <span>Gagal memuat data analytics: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const savingsGrowthData = savingsAnalytics?.monthlyGrowth || [];
  const loansGrowthData = loansAnalytics?.monthlyDisbursement || [];
  
  const savingsByTypeData = savingsAnalytics?.savingsByType ? 
    Object.entries(savingsAnalytics.savingsByType).map(([type, amount]) => ({
      name: type === 'wajib' ? 'Wajib' : type === 'sukarela' ? 'Sukarela' : 'Pokok',
      value: amount as number
    })) : [];

  const loansByTypeData = loansAnalytics?.loansByType ? 
    Object.entries(loansAnalytics.loansByType).map(([type, amount]) => ({
      name: type === 'produktif' ? 'Produktif' : type === 'konsumtif' ? 'Konsumtif' : 'Darurat',
      value: amount as number
    })) : [];

  const loansByStatusData = loansAnalytics?.loansByStatus ? 
    Object.entries(loansAnalytics.loansByStatus).map(([status, count]) => ({
      name: status === 'aktif' ? 'Aktif' : status === 'lunas' ? 'Lunas' : 'Bermasalah',
      value: count as number
    })) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Analytics
        </h2>
        <Button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
          <FaRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Savings */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Simpanan</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(savingsAnalytics?.totalSavings || 0)}
                </p>
                <p className="text-blue-100 text-xs mt-1">
                  {savingsAnalytics?.totalMembers || 0} anggota
                </p>
              </div>
              <FaPiggyBank className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Total Loans */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Pinjaman</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(loansAnalytics?.totalLoans || 0)}
                </p>
                <p className="text-green-100 text-xs mt-1">
                  Disalurkan
                </p>
              </div>
              <FaHandHoldingUsd className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Loans */}
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Sisa Pinjaman</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(loansAnalytics?.totalOutstanding || 0)}
                </p>
                <p className="text-orange-100 text-xs mt-1">
                  Belum dibayar
                </p>
              </div>
              <FaMoneyBillWave className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Loans */}
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Pinjaman Jatuh Tempo</p>
                <p className="text-2xl font-bold">{overdueLoans.length}</p>
                <p className="text-red-100 text-xs mt-1">
                  Perlu tindakan
                </p>
              </div>
              <FaExclamationTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="w-5 h-5 text-blue-600" />
              Pertumbuhan Simpanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={savingsGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Jumlah']}
                    labelFormatter={(label) => `Bulan: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Loans Disbursement Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="w-5 h-5 text-green-600" />
              Penyaluran Pinjaman
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loansGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Jumlah']}
                    labelFormatter={(label) => `Bulan: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Simpanan per Jenis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={savingsByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {savingsByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Loans by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Pinjaman per Jenis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loansByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {loansByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Loans by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Status Pinjaman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loansByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {loansByStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Loans Alert */}
      {overdueLoans.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <FaExclamationTriangle className="w-5 h-5" />
              Pinjaman Jatuh Tempo ({overdueLoans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLoans.slice(0, 5).map((loan: any) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div>
                    <p className="font-medium">{loan.members?.nama_lengkap}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sisa: {formatCurrency(loan.sisa_pinjaman)} | Jatuh tempo: {new Date(loan.due_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {Math.floor((new Date().getTime() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24))} hari
                    </p>
                    <p className="text-xs text-gray-500">terlambat</p>
                  </div>
                </div>
              ))}
              {overdueLoans.length > 5 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Dan {overdueLoans.length - 5} pinjaman lainnya...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;