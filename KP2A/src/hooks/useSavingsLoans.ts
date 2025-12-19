import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  savingsService, 
  loansService, 
  membersService, 
  analyticsService,
  realtimeService 
} from '../services/savingsLoansService';
import { MemberSavings, LoanFromMember, LoanToMember } from '../types/savingsLoans';

// Hook for managing savings data
export const useSavings = () => {
  const [savings, setSavings] = useState<any[]>([]);
  const [savingsSummary, setSavingsSummary] = useState<MemberSavings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all savings
  const loadSavings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await savingsService.getAllSavings();
      setSavings(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memuat data simpanan');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load savings summary
  const loadSavingsSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await savingsService.getSavingsSummary();
      setSavingsSummary(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memuat ringkasan simpanan');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new savings
  const createSavings = useCallback(async (savingsData: {
    member_id: string;
    jenis_simpanan: 'wajib' | 'sukarela' | 'pokok';
    jumlah: number;
    tanggal: string;
    keterangan?: string;
  }) => {
    try {
      setLoading(true);
      const newSavings = await savingsService.createSavings(savingsData);
      setSavings(prev => [newSavings, ...prev]);
      toast.success('Simpanan berhasil dicatat');
      await loadSavingsSummary(); // Refresh summary
      return newSavings;
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal mencatat simpanan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadSavingsSummary]);

  // Update savings
  const updateSavings = useCallback(async (id: string, updates: any) => {
    try {
      setLoading(true);
      const updatedSavings = await savingsService.updateSavings(id, updates);
      setSavings(prev => prev.map(s => s.id === id ? updatedSavings : s));
      toast.success('Simpanan berhasil diperbarui');
      await loadSavingsSummary(); // Refresh summary
      return updatedSavings;
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memperbarui simpanan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadSavingsSummary]);

  // Delete savings
  const deleteSavings = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await savingsService.deleteSavings(id);
      setSavings(prev => prev.filter(s => s.id !== id));
      toast.success('Simpanan berhasil dihapus');
      await loadSavingsSummary(); // Refresh summary
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal menghapus simpanan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadSavingsSummary]);

  // Setup real-time subscription
  useEffect(() => {
    const subscription = realtimeService.subscribeSavings((payload) => {
      if (payload.eventType === 'INSERT') {
        setSavings(prev => [payload.new, ...prev]);
        loadSavingsSummary();
      } else if (payload.eventType === 'UPDATE') {
        setSavings(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        loadSavingsSummary();
      } else if (payload.eventType === 'DELETE') {
        setSavings(prev => prev.filter(s => s.id !== payload.old.id));
        loadSavingsSummary();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSavingsSummary]);

  return {
    savings,
    savingsSummary,
    loading,
    error,
    loadSavings,
    loadSavingsSummary,
    createSavings,
    updateSavings,
    deleteSavings
  };
};

// Hook for managing loans data
export const useLoans = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all loans
  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loansService.getAllLoans();
      setLoans(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memuat data pinjaman');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load overdue loans
  const loadOverdueLoans = useCallback(async () => {
    try {
      const data = await loansService.getOverdueLoans();
      setOverdueLoans(data);
    } catch (err: any) {
      console.error('Failed to load overdue loans:', err);
    }
  }, []);

  // Create new loan
  const createLoan = useCallback(async (loanData: {
    member_id: string;
    jenis_pinjaman: 'produktif' | 'konsumtif' | 'darurat';
    jumlah_pinjaman: number;
    bunga_persen: number;
    tenor_bulan: number;
    angsuran_bulanan: number;
    tanggal_pinjaman: string;
    jatuh_tempo: string;
    tujuan_pinjaman?: string;
    status: 'aktif' | 'lunas' | 'bermasalah';
  }) => {
    try {
      setLoading(true);
      const newLoan = await loansService.createLoan(loanData);
      setLoans(prev => [newLoan, ...prev]);
      toast.success('Pinjaman berhasil dicatat');
      return newLoan;
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal mencatat pinjaman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update loan
  const updateLoan = useCallback(async (id: string, updates: any) => {
    try {
      setLoading(true);
      const updatedLoan = await loansService.updateLoan(id, updates);
      setLoans(prev => prev.map(l => l.id === id ? updatedLoan : l));
      toast.success('Pinjaman berhasil diperbarui');
      return updatedLoan;
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memperbarui pinjaman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete loan
  const deleteLoan = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await loansService.deleteLoan(id);
      setLoans(prev => prev.filter(l => l.id !== id));
      toast.success('Pinjaman berhasil dihapus');
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal menghapus pinjaman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create loan payment
  const createLoanPayment = useCallback(async (paymentData: {
    loan_id: string;
    jumlah_bayar: number;
    tanggal_bayar: string;
    keterangan?: string;
  }) => {
    try {
      setLoading(true);
      const payment = await loansService.createLoanPayment(paymentData);
      toast.success('Pembayaran angsuran berhasil dicatat');
      await loadLoans(); // Refresh loans to get updated amounts
      return payment;
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal mencatat pembayaran');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadLoans]);

  // Setup real-time subscriptions
  useEffect(() => {
    const loansSubscription = realtimeService.subscribeLoans((payload) => {
      if (payload.eventType === 'INSERT') {
        setLoans(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setLoans(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
      } else if (payload.eventType === 'DELETE') {
        setLoans(prev => prev.filter(l => l.id !== payload.old.id));
      }
    });

    const paymentsSubscription = realtimeService.subscribeLoanPayments((payload) => {
      if (payload.eventType === 'INSERT') {
        loadLoans(); // Refresh loans when payment is added
      }
    });

    return () => {
      loansSubscription.unsubscribe();
      paymentsSubscription.unsubscribe();
    };
  }, [loadLoans]);

  // Check for overdue loans periodically
  useEffect(() => {
    loadOverdueLoans();
    const interval = setInterval(loadOverdueLoans, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [loadOverdueLoans]);

  return {
    loans,
    overdueLoans,
    loading,
    error,
    loadLoans,
    loadOverdueLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    createLoanPayment
  };
};

// Hook for managing members data
export const useMembers = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active members
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await membersService.getActiveMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    loading,
    error,
    loadMembers
  };
};

// Hook for analytics data
export const useAnalytics = () => {
  const [savingsAnalytics, setSavingsAnalytics] = useState<any>(null);
  const [loansAnalytics, setLoansAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load savings analytics
  const loadSavingsAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getSavingsAnalytics();
      setSavingsAnalytics(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load savings analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load loans analytics
  const loadLoansAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getLoansAnalytics();
      setLoansAnalytics(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load loans analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all analytics
  const loadAnalytics = useCallback(async () => {
    await Promise.all([
      loadSavingsAnalytics(),
      loadLoansAnalytics()
    ]);
  }, [loadSavingsAnalytics, loadLoansAnalytics]);

  return {
    savingsAnalytics,
    loansAnalytics,
    loading,
    error,
    loadAnalytics,
    loadSavingsAnalytics,
    loadLoansAnalytics
  };
};