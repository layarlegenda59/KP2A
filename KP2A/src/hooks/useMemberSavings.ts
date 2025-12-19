import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Utility function to handle Supabase errors
const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  // Check for network errors
  if (!navigator.onLine) {
    return 'Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.';
  }
  
  // Check for RLS policy errors
  if (error?.code === 'PGRST116' || error?.message?.includes('row-level security')) {
    return 'Akses ditolak. Silakan login terlebih dahulu untuk mengakses data.';
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
  return error?.message || 'Terjadi kesalahan yang tidak diketahui';
};

export interface MemberSaving {
  id: string;
  member_id: string;
  type: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  // Joined data from members table
  member?: {
    id: string;
    nama_lengkap: string;
    id_anggota: string;
    no_hp: string;
    status_keanggotaan: string;
  };
}

export interface CreateSavingData {
  member_id: string;
  type: string;
  amount: number;
  description?: string;
  transaction_date?: string;
}

export interface UpdateSavingData {
  type?: string;
  amount?: number;
  description?: string;
  transaction_date?: string;
}

export interface SavingsFilters {
  member_id?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export const useMemberSavings = () => {
  const [savings, setSavings] = useState<MemberSaving[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch savings with filters and pagination
  const fetchSavings = async (
    filters: SavingsFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
    retryCount = 0
  ) => {
    // Prevent multiple simultaneous requests
    if (loading && retryCount === 0) {
      return;
    }

    try {
      if (retryCount === 0) {
        setLoading(true);
        setError(null);
      }

      let query = supabase
        .from('savings')
        .select(`
          *,
          member:members(
            id,
            nama_lengkap,
            id_anggota,
            no_hp,
            status_keanggotaan
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      if (filters.search) {
        query = query.or(`
          description.ilike.%${filters.search}%,
          member.nama_lengkap.ilike.%${filters.search}%,
          member.id_anggota.ilike.%${filters.search}%
        `);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setSavings(data || []);
      setTotalCount(count || 0);
      
      // Clear error on successful fetch
      if (retryCount > 0) {
        setError(null);
      }
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      
      // Retry mechanism for network errors (max 2 retries)
      if (retryCount < 2 && (
        errorMessage.includes('koneksi') || 
        errorMessage.includes('server') ||
        errorMessage.includes('network')
      )) {
        console.log(`Retrying fetchSavings... attempt ${retryCount + 1}`);
        // Don't set loading to false during retry
        setTimeout(() => {
          fetchSavings(filters, pagination, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(errorMessage);
      
      // Only show toast for final error (not during retries)
      if (retryCount === 0 || retryCount >= 2) {
        toast.error(errorMessage);
      }
    } finally {
      // Only set loading to false on final attempt
      if (retryCount >= 2 || retryCount === 0) {
        setLoading(false);
      }
    }
  };

  // Create new saving
  const createSaving = async (data: CreateSavingData) => {
    try {
      setLoading(true);
      setError(null);

      const { data: newSaving, error: createError } = await supabase
        .from('savings')
        .insert([{
          ...data,
          transaction_date: data.transaction_date || new Date().toISOString().split('T')[0]
        }])
        .select(`
          *,
          member:members(
            id,
            nama_lengkap,
            id_anggota,
            no_hp,
            status_keanggotaan
          )
        `)
        .single();

      if (createError) {
        throw createError;
      }

      setSavings(prev => [newSaving, ...prev]);
      setTotalCount(prev => prev + 1);
      toast.success('Simpanan berhasil ditambahkan');
      return newSaving;
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update saving
  const updateSaving = async (id: string, data: UpdateSavingData) => {
    try {
      setLoading(true);
      setError(null);

      const { data: updatedSaving, error: updateError } = await supabase
        .from('savings')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          member:members(
            id,
            nama_lengkap,
            id_anggota,
            no_hp,
            status_keanggotaan
          )
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setSavings(prev => 
        prev.map(saving => 
          saving.id === id ? updatedSaving : saving
        )
      );
      toast.success('Simpanan berhasil diperbarui');
      return updatedSaving;
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete saving
  const deleteSaving = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('savings')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setSavings(prev => prev.filter(saving => saving.id !== id));
      setTotalCount(prev => prev - 1);
      toast.success('Simpanan berhasil dihapus');
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get savings summary by member
  const getSavingsSummary = async (memberId?: string) => {
    try {
      let query = supabase
        .from('savings')
        .select('type, amount');

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const summary = data?.reduce((acc, saving) => {
        if (!acc[saving.type]) {
          acc[saving.type] = 0;
        }
        acc[saving.type] += Number(saving.amount);
        return acc;
      }, {} as Record<string, number>) || {};

      return summary;
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      toast.error(errorMessage);
      return {};
    }
  };

  // Export savings data
  const exportSavings = async (filters: SavingsFilters = {}) => {
    try {
      setLoading(true);

      let query = supabase
        .from('savings')
        .select(`
          *,
          member:members(
            nama_lengkap,
            id_anggota,
            no_hp
          )
        `);

      // Apply same filters as fetchSavings
      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengekspor data simpanan';
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time changes
  const subscribeToSavings = () => {
    let isSubscribed = true;
    
    const subscription = supabase
      .channel('savings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'savings' 
        }, 
        async (payload) => {
          // Prevent updates if component is unmounted
          if (!isSubscribed) return;
          
          try {
            if (payload.eventType === 'INSERT') {
              // Fetch the new record with member data
              const { data, error } = await supabase
                .from('savings')
                .select(`
                  *,
                  member:members(
                    id,
                    nama_lengkap,
                    id_anggota,
                    no_hp,
                    status_keanggotaan
                  )
                `)
                .eq('id', payload.new.id)
                .single();
                
              if (data && !error && isSubscribed) {
                setSavings(prev => {
                  // Check if record already exists to prevent duplicates
                  const exists = prev.some(s => s.id === data.id);
                  if (exists) {
                    return prev.map(s => s.id === data.id ? data : s);
                  }
                  return [data, ...prev];
                });
                setTotalCount(prev => prev + 1);
              }
            } else if (payload.eventType === 'UPDATE') {
              // Fetch the updated record with member data
              const { data, error } = await supabase
                .from('savings')
                .select(`
                  *,
                  member:members(
                    id,
                    nama_lengkap,
                    id_anggota,
                    no_hp,
                    status_keanggotaan
                  )
                `)
                .eq('id', payload.new.id)
                .single();
                
              if (data && !error && isSubscribed) {
                setSavings(prev => 
                  prev.map(saving => 
                    saving.id === data.id ? data : saving
                  )
                );
              }
            } else if (payload.eventType === 'DELETE') {
              if (isSubscribed) {
                setSavings(prev => prev.filter(saving => saving.id !== payload.old.id));
                setTotalCount(prev => Math.max(0, prev - 1));
              }
            }
          } catch (error) {
            console.error('Error handling real-time update:', error);
            // Don't show toast for real-time errors to prevent spam
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  };

  return {
    savings,
    loading,
    error,
    totalCount,
    fetchSavings,
    createSaving,
    updateSaving,
    deleteSaving,
    getSavingsSummary,
    exportSavings,
    subscribeToSavings
  };
};