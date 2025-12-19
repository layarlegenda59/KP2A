import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { 
  FaPiggyBank, 
  FaHandHoldingUsd, 
  FaUsers, 
  FaExclamationTriangle,
  FaArrowUp,
  FaChartLine
} from 'react-icons/fa';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useMemberSavings } from '../../hooks/useMemberSavings';
import { useLoansFromMembers } from '../../hooks/useLoansFromMembers';
import { useSavingsRealtimeUpdates, useLoansRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { 
  SkeletonStats, 
  SkeletonChart, 
  ErrorDisplay, 
  LoadingSpinner,
  useRetry 
} from '../UI/LoadingStates';
import { ErrorBoundary } from '../UI/ErrorBoundary';
import { AuthRequiredFallback } from '../UI/AuthRequiredFallback';

interface DashboardStats {
  totalSavings: number;
  totalLoans: number;
  totalMembers: number;
  overdueLoans: number;
  savingsGrowth: number;
  loansGrowth: number;
}

interface ChartData {
  month: string;
  savings: number;
  loans: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

const SavingsLoansDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSavings: 0,
    totalLoans: 0,
    totalMembers: 0,
    overdueLoans: 0,
    savingsGrowth: 0,
    loansGrowth: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [savingsTypeData, setSavingsTypeData] = useState<any[]>([]);
  const [loanStatusData, setLoanStatusData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getSavingsSummary, fetchSavings } = useMemberSavings();
  const { getLoanSummary, getOverdueLoans, fetchLoans } = useLoansFromMembers();

  // Define loadDashboardData function before using it
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel with fallback handling
      const [
        savingsSummary,
        loanSummary,
        overdueLoans,
        recentSavings,
        recentLoans
      ] = await Promise.all([
        getSavingsSummary().catch(() => ({})),
        getLoanSummary().catch(() => ({ totalAmount: 0, totalLoans: 0, activeLoans: 0, overdueLoans: 0, completedLoans: 0 })),
        getOverdueLoans().catch(() => []),
        fetchSavings({}, { page: 1, limit: 5 }).catch(() => []),
        fetchLoans({}, { page: 1, limit: 5 }).catch(() => [])
      ]);

      // Calculate stats with safe handling
      const totalSavings = savingsSummary && typeof savingsSummary === 'object' 
        ? Object.values(savingsSummary).reduce((sum: number, amount: any) => sum + Number(amount || 0), 0)
        : 0;
      
      setStats({
        totalSavings,
        totalLoans: loanSummary?.totalAmount || 0,
        totalMembers: loanSummary?.totalLoans || 0, // This should be actual member count
        overdueLoans: Array.isArray(overdueLoans) ? overdueLoans.length : 0,
        savingsGrowth: 12.5, // Calculate actual growth
        loansGrowth: 8.3 // Calculate actual growth
      });

      // Generate chart data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const mockChartData = months.map(month => ({
        month,
        savings: Math.floor(Math.random() * 50000000) + 10000000,
        loans: Math.floor(Math.random() * 30000000) + 5000000
      }));
      setChartData(mockChartData);

      // Savings type distribution with safe handling
      const savingsTypes = savingsSummary && typeof savingsSummary === 'object'
        ? Object.entries(savingsSummary).map(([type, amount]) => ({
            name: type === 'operasional' ? 'Simpanan Operasional' : 
                  type === 'dana_pinjaman' ? 'Dana Pinjaman' : type,
            value: Number(amount || 0),
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
          }))
        : [];
      setSavingsTypeData(savingsTypes);

      // Loan status distribution with safe handling
      const statusData = [
        { name: 'Aktif', value: loanSummary?.activeLoans || 0, color: '#82ca9d' },
        { name: 'Terlambat', value: loanSummary?.overdueLoans || 0, color: '#ff7300' },
        { name: 'Lunas', value: loanSummary?.completedLoans || 0, color: '#8884d8' }
      ];
      setLoanStatusData(statusData);

      // Recent activities (combine savings and loans)
      const activities = [
        ...(recentSavings && Array.isArray(recentSavings) ? recentSavings.slice(0, 3) : []).map((saving: any) => ({
          id: saving.id,
          type: 'saving',
          description: `Simpanan ${saving.type} - ${saving.member?.nama_lengkap}`,
          amount: saving.amount,
          date: saving.created_at
        })),
        ...(recentLoans && Array.isArray(recentLoans) ? recentLoans.slice(0, 2) : []).map((loan: any) => ({
          id: loan.id,
          type: 'loan',
          description: `Pinjaman - ${loan.member?.nama_lengkap}`,
          amount: loan.amount,
          date: loan.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentActivities(activities);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates (now that loadDashboardData is defined)
  useSavingsRealtimeUpdates(() => {
    loadDashboardData();
  });

  useLoansRealtimeUpdates(() => {
    loadDashboardData();
  });

  // Retry mechanism (now that loadDashboardData is defined)
  const { retry, retryCount, isRetrying, canRetry } = useRetry(
    loadDashboardData,
    3,
    2000
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !isRetrying) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error && !loading) {
    // Check if it's an authentication/RLS error
    if (error.includes('login') || error.includes('Akses ditolak') || error.includes('Sesi') || error.includes('tidak bisa login')) {
      return (
        <AuthRequiredFallback
          title="Akses Dashboard Terbatas"
          message="Anda perlu login untuk mengakses dashboard simpanan dan pinjaman. Data ini dilindungi oleh sistem keamanan."
          onLoginClick={() => {
            window.location.href = '/login';
          }}
        />
      );
    }
    
    return (
      <ErrorDisplay
        title="Gagal Memuat Dashboard"
        message={error}
        onRetry={canRetry ? retry : loadDashboardData}
        showRetry={true}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Simpanan</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalSavings)}</p>
                  <div className="flex items-center mt-2">
                    <FaArrowUp className="w-3 h-3 mr-1" />
                    <span className="text-xs text-blue-100">+{stats.savingsGrowth}% bulan ini</span>
                  </div>
                </div>
                <FaPiggyBank className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Pinjaman</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalLoans)}</p>
                  <div className="flex items-center mt-2">
                    <FaArrowUp className="w-3 h-3 mr-1" />
                    <span className="text-xs text-green-100">+{stats.loansGrowth}% bulan ini</span>
                  </div>
                </div>
                <FaHandHoldingUsd className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Anggota</p>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <div className="flex items-center mt-2">
                    <FaArrowUp className="w-3 h-3 mr-1" />
                    <span className="text-xs text-purple-100">Aktif</span>
                  </div>
                </div>
                <FaUsers className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Pinjaman Terlambat</p>
                  <p className="text-2xl font-bold">{stats.overdueLoans}</p>
                  <div className="flex items-center mt-2">
                    <FaExclamationTriangle className="w-3 h-3 mr-1" />
                    <span className="text-xs text-red-100">Perlu perhatian</span>
                  </div>
                </div>
                <FaExclamationTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaChartLine className="w-5 h-5 mr-2 text-blue-600" />
                Tren Simpanan &amp; Pinjaman
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRetrying ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner text="Memperbarui data..." />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelFormatter={(label) => `Bulan: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Simpanan"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="loans" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Pinjaman"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Savings Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Jenis Simpanan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={savingsTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {savingsTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loan Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status Pinjaman</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loanStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {loanStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Terkini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {recentActivities.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Belum ada aktivitas terkini
                  </p>
                ) : (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'saving' 
                            ? 'bg-blue-100 dark:bg-blue-900/20' 
                            : 'bg-green-100 dark:bg-green-900/20'
                        }`}>
                          {activity.type === 'saving' ? (
                            <FaPiggyBank className={`w-4 h-4 ${
                              activity.type === 'saving' 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          ) : (
                            <FaHandHoldingUsd className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(activity.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SavingsLoansDashboard;
