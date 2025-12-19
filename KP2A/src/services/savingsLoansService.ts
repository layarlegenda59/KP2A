import { supabase } from '../lib/supabase';
import { MemberSavings, LoanFromMember, LoanToMember } from '../types/savingsLoans';

// Savings Services
export const savingsService = {
  // Get all member savings
  async getAllSavings() {
    const { data, error } = await supabase
      .from('savings')
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get savings by member ID
  async getSavingsByMember(memberId: string) {
    const { data, error } = await supabase
      .from('savings')
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create new savings record
  async createSavings(savingsData: {
    member_id: string;
    jenis_simpanan: 'wajib' | 'sukarela' | 'pokok';
    jumlah: number;
    tanggal: string;
    keterangan?: string;
  }) {
    // Map Indonesian field names to English database column names
    const mappedData = {
      member_id: savingsData.member_id,
      type: savingsData.jenis_simpanan === 'wajib' ? 'Simpanan Wajib' : 
            savingsData.jenis_simpanan === 'sukarela' ? 'Simpanan Sukarela' : 
            'Simpanan Pokok',
      amount: savingsData.jumlah,
      transaction_date: savingsData.tanggal,
      description: savingsData.keterangan
    };

    const { data, error } = await supabase
      .from('savings')
      .insert([mappedData])
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update savings record
  async updateSavings(id: string, updates: Partial<{
    jenis_simpanan: 'wajib' | 'sukarela' | 'pokok';
    jumlah: number;
    tanggal: string;
    keterangan: string;
  }>) {
    const { data, error } = await supabase
      .from('savings')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete savings record
  async deleteSavings(id: string) {
    const { error } = await supabase
      .from('savings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get savings summary by member
  async getSavingsSummary() {
    const { data, error } = await supabase
      .from('savings')
      .select(`
        member_id,
        jenis_simpanan,
        jumlah,
        members!inner(id, nama_lengkap, id_anggota)
      `);

    if (error) throw error;

    // Group by member and calculate totals
    const summary = data.reduce((acc: any, saving: any) => {
      const memberId = saving.member_id;
      if (!acc[memberId]) {
        acc[memberId] = {
          id: memberId,
          memberId: memberId,
          memberName: saving.members.nama_lengkap,
          memberCode: saving.members.id_anggota,
          operationalSavings: 0,
          mandatorySavings: 0,
          voluntarySavings: 0,
          total: 0,
          lastUpdated: new Date()
        };
      }

      switch (saving.jenis_simpanan) {
        case 'pokok':
          acc[memberId].operationalSavings += saving.jumlah;
          break;
        case 'wajib':
          acc[memberId].mandatorySavings += saving.jumlah;
          break;
        case 'sukarela':
          acc[memberId].voluntarySavings += saving.jumlah;
          break;
      }

      acc[memberId].total = acc[memberId].operationalSavings + 
                           acc[memberId].mandatorySavings + 
                           acc[memberId].voluntarySavings;

      return acc;
    }, {});

    return Object.values(summary);
  }
};

// Loans Services
export const loansService = {
  // Get all loans
  async getAllLoans() {
    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota),
        loan_payments(id, jumlah_bayar, tanggal_bayar)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get loans by member ID
  async getLoansByMember(memberId: string) {
    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota),
        loan_payments(id, jumlah_bayar, tanggal_bayar)
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Create new loan
  async createLoan(loanData: {
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
  }) {
    const { data, error } = await supabase
      .from('loans')
      .insert([{
        ...loanData,
        sisa_pinjaman: loanData.jumlah_pinjaman,
        sudah_bayar_angsuran: 0
      }])
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update loan
  async updateLoan(id: string, updates: Partial<{
    jenis_pinjaman: 'produktif' | 'konsumtif' | 'darurat';
    jumlah_pinjaman: number;
    bunga_persen: number;
    tenor_bulan: number;
    angsuran_bulanan: number;
    tanggal_pinjaman: string;
    jatuh_tempo: string;
    tujuan_pinjaman: string;
    status: 'aktif' | 'lunas' | 'bermasalah';
    sisa_pinjaman: number;
    sudah_bayar_angsuran: number;
  }>) {
    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete loan
  async deleteLoan(id: string) {
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Create loan payment
  async createLoanPayment(paymentData: {
    loan_id: string;
    jumlah_bayar: number;
    tanggal_bayar: string;
    keterangan?: string;
  }) {
    const { data, error } = await supabase
      .from('loan_payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

    // Update loan remaining amount
    const { data: loan } = await supabase
      .from('loans')
      .select('sisa_pinjaman, sudah_bayar_angsuran')
      .eq('id', paymentData.loan_id)
      .single();

    if (loan) {
      const newRemainingAmount = loan.sisa_pinjaman - paymentData.jumlah_bayar;
      const newPaidInstallments = loan.sudah_bayar_angsuran + 1;
      
      await supabase
        .from('loans')
        .update({
          sisa_pinjaman: Math.max(0, newRemainingAmount),
          sudah_bayar_angsuran: newPaidInstallments,
          status: newRemainingAmount <= 0 ? 'lunas' : 'aktif'
        })
        .eq('id', paymentData.loan_id);
    }

    return data;
  },

  // Get loan payments
  async getLoanPayments(loanId: string) {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('tanggal_bayar', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get overdue loans
  async getOverdueLoans() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        members!inner(id, nama_lengkap, id_anggota)
      `)
      .eq('status', 'aktif')
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data;
  }
};

// Utility function to handle Supabase errors for members service
const handleMembersError = (error: any): string => {
  console.error('Members service error:', error);
  
  // Check for network errors
  if (!navigator.onLine) {
    return 'Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.';
  }
  
  // Check for RLS policy errors
  if (error?.code === 'PGRST116' || error?.message?.includes('row-level security')) {
    return 'Akses ditolak. Silakan login terlebih dahulu untuk mengakses data anggota.';
  }
  
  // Check for authentication errors
  if (error?.code === '401' || error?.message?.includes('JWT')) {
    return 'Sesi Anda telah berakhir. Silakan login kembali.';
  }
  
  // Check for network/connection errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.code === 'NETWORK_ERROR') {
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
  }
  
  // Default error message
  return error?.message || 'Terjadi kesalahan saat mengambil data anggota';
};

// Members Service
export const membersService = {
  // Get all active members with retry mechanism
  async getActiveMembers(retryCount = 0) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, nama_lengkap, id_anggota, no_hp')
        .eq('status_keanggotaan', 'aktif')
        .order('nama_lengkap', { ascending: true });

      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      const errorMessage = handleMembersError(error);
      
      // Retry mechanism for network errors (max 2 retries)
      if (retryCount < 2 && (
        errorMessage.includes('koneksi') || 
        errorMessage.includes('server') ||
        errorMessage.includes('network')
      )) {
        console.log(`Retrying getActiveMembers... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.getActiveMembers(retryCount + 1);
      }
      
      throw new Error(errorMessage);
    }
  },

  // Get member by ID
  async getMemberById(id: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};

// Analytics Service
export const analyticsService = {
  // Get savings analytics
  async getSavingsAnalytics() {
    const { data, error } = await supabase
      .from('savings')
      .select('jenis_simpanan, jumlah, created_at');

    if (error) throw error;

    const analytics = {
      totalSavings: data.reduce((sum, saving) => sum + saving.jumlah, 0),
      savingsByType: data.reduce((acc: any, saving) => {
        acc[saving.jenis_simpanan] = (acc[saving.jenis_simpanan] || 0) + saving.jumlah;
        return acc;
      }, {}),
      monthlyGrowth: this.calculateMonthlyGrowth(data),
      totalMembers: new Set(data.map(s => s.member_id)).size
    };

    return analytics;
  },

  // Get loans analytics
  async getLoansAnalytics() {
    const { data, error } = await supabase
      .from('loans')
      .select('jenis_pinjaman, jumlah_pinjaman, sisa_pinjaman, status, created_at');

    if (error) throw error;

    const analytics = {
      totalLoans: data.reduce((sum, loan) => sum + loan.jumlah_pinjaman, 0),
      totalOutstanding: data.reduce((sum, loan) => sum + loan.sisa_pinjaman, 0),
      loansByType: data.reduce((acc: any, loan) => {
        acc[loan.jenis_pinjaman] = (acc[loan.jenis_pinjaman] || 0) + loan.jumlah_pinjaman;
        return acc;
      }, {}),
      loansByStatus: data.reduce((acc: any, loan) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
      }, {}),
      monthlyDisbursement: this.calculateMonthlyGrowth(data)
    };

    return analytics;
  },

  // Calculate monthly growth
  calculateMonthlyGrowth(data: any[]) {
    const monthlyData = data.reduce((acc: any, item) => {
      const month = new Date(item.created_at).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + (item.jumlah || item.jumlah_pinjaman || 0);
      return acc;
    }, {});

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }
};

// Real-time subscriptions
export const realtimeService = {
  // Subscribe to savings changes
  subscribeSavings(callback: (payload: any) => void) {
    return supabase
      .channel('savings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'savings' }, 
        callback
      )
      .subscribe();
  },

  // Subscribe to loans changes
  subscribeLoans(callback: (payload: any) => void) {
    return supabase
      .channel('loans_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'loans' }, 
        callback
      )
      .subscribe();
  },

  // Subscribe to loan payments changes
  subscribeLoanPayments(callback: (payload: any) => void) {
    return supabase
      .channel('loan_payments_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'loan_payments' }, 
        callback
      )
      .subscribe();
  }
};