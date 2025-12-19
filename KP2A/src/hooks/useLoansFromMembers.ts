import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface LoanFromMember {
  id: string;
  member_id: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  purpose: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'overdue' | 'rejected';
  loan_date: string;
  due_date: string;
  monthly_payment: number;
  remaining_balance: number;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    nama_lengkap: string;
    id_anggota: string;
    no_hp: string;
    alamat: string;
  };
  loan_payments?: LoanPayment[];
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'principal' | 'interest' | 'penalty';
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
}

export interface LoansFilters {
  search?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface LoanSummary {
  totalLoans: number;
  totalAmount: number;
  activeLoans: number;
  overdueLoans: number;
  completedLoans: number;
  totalInterest: number;
}

export const useLoansFromMembers = () => {
  const [loans, setLoans] = useState<LoanFromMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch loans with filters and pagination
  const fetchLoans = useCallback(async (filters: LoansFilters = {}, pagination: PaginationOptions = { page: 1, limit: 10 }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('loans')
        .select(`
          *,
          member:members(id, nama_lengkap, id_anggota, no_hp, alamat),
          loan_payments(*)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`member.nama_lengkap.ilike.%${filters.search}%,member.id_anggota.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }

      if (filters.dateFrom) {
        query = query.gte('loan_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('loan_date', filters.dateTo);
      }

      // Get total count
      const { count } = await query.select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setLoans(data || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch loans');
      toast.error('Gagal memuat data pinjaman');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new loan
  const createLoan = useCallback(async (loanData: Omit<LoanFromMember, 'id' | 'created_at' | 'updated_at' | 'member' | 'loan_payments'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('loans')
        .insert([loanData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      toast.success('Pinjaman berhasil ditambahkan');
      return data;
    } catch (err) {
      console.error('Error creating loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to create loan');
      toast.error('Gagal menambahkan pinjaman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update loan
  const updateLoan = useCallback(async (id: string, updates: Partial<LoanFromMember>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('loans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setLoans(prev => prev.map(loan => loan.id === id ? { ...loan, ...data } : loan));
      toast.success('Pinjaman berhasil diperbarui');
      return data;
    } catch (err) {
      console.error('Error updating loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update loan');
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
      setError(null);

      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setLoans(prev => prev.filter(loan => loan.id !== id));
      toast.success('Pinjaman berhasil dihapus');
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete loan');
      toast.error('Gagal menghapus pinjaman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add loan payment
  const addLoanPayment = useCallback(async (loanId: string, paymentData: Omit<LoanPayment, 'id' | 'loan_id' | 'created_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: paymentError } = await supabase
        .from('loan_payments')
        .insert([{ ...paymentData, loan_id: loanId }])
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      // Update loan balance
      const loan = loans.find(l => l.id === loanId);
      if (loan && paymentData.payment_type === 'principal') {
        const newBalance = loan.remaining_balance - paymentData.amount;
        await updateLoan(loanId, { 
          remaining_balance: newBalance,
          status: newBalance <= 0 ? 'completed' : loan.status
        });
      }

      toast.success('Pembayaran berhasil dicatat');
      return data;
    } catch (err) {
      console.error('Error adding payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add payment');
      toast.error('Gagal mencatat pembayaran');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loans, updateLoan]);

  // Get loan summary
  const getLoanSummary = useCallback(async (): Promise<LoanSummary> => {
    try {
      const { data, error: summaryError } = await supabase
        .from('loans')
        .select('amount, status, interest_rate, remaining_balance');

      if (summaryError) {
        throw summaryError;
      }

      const summary: LoanSummary = {
        totalLoans: data.length,
        totalAmount: data.reduce((sum, loan) => sum + loan.amount, 0),
        activeLoans: data.filter(loan => loan.status === 'active').length,
        overdueLoans: data.filter(loan => loan.status === 'overdue').length,
        completedLoans: data.filter(loan => loan.status === 'completed').length,
        totalInterest: data.reduce((sum, loan) => sum + (loan.amount * loan.interest_rate / 100), 0)
      };

      return summary;
    } catch (err) {
      console.error('Error getting loan summary:', err);
      throw err;
    }
  }, []);

  // Get overdue loans for notifications
  const getOverdueLoans = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error: overdueError } = await supabase
        .from('loans')
        .select(`
          *,
          member:members(nama_lengkap, id_anggota, no_hp)
        `)
        .eq('status', 'active')
        .lt('due_date', today);

      if (overdueError) {
        throw overdueError;
      }

      return data || [];
    } catch (err) {
      console.error('Error getting overdue loans:', err);
      return [];
    }
  }, []);

  // Export loans data
  const exportLoans = useCallback(async (filters: LoansFilters = {}) => {
    try {
      let query = supabase
        .from('loans')
        .select(`
          *,
          member:members(nama_lengkap, id_anggota, no_hp, alamat)
        `)
        .order('created_at', { ascending: false });

      // Apply same filters as fetchLoans
      if (filters.search) {
        query = query.or(`member.nama_lengkap.ilike.%${filters.search}%,member.id_anggota.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }

      if (filters.dateFrom) {
        query = query.gte('loan_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('loan_date', filters.dateTo);
      }

      const { data, error: exportError } = await query;

      if (exportError) {
        throw exportError;
      }

      return data || [];
    } catch (err) {
      console.error('Error exporting loans:', err);
      throw err;
    }
  }, []);

  // Subscribe to real-time changes
  const subscribeToLoans = useCallback(() => {
    const subscription = supabase
      .channel('loans_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'loans' },
        (payload) => {
          console.log('Loans change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the new loan with member data
            supabase
              .from('loans')
              .select(`
                *,
                member:members(id, nama_lengkap, id_anggota, no_hp, alamat),
                loan_payments(*)
              `)
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setLoans(prev => [data, ...prev]);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            setLoans(prev => prev.map(loan => 
              loan.id === payload.new.id 
                ? { ...loan, ...payload.new }
                : loan
            ));
          } else if (payload.eventType === 'DELETE') {
            setLoans(prev => prev.filter(loan => loan.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    loans,
    loading,
    error,
    totalCount,
    fetchLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    addLoanPayment,
    getLoanSummary,
    getOverdueLoans,
    exportLoans,
    subscribeToLoans
  };
};