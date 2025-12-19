// API Client for MySQL Backend
// Replaces Supabase client

const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 API Request:', 'GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  async post<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 API Request (POST):', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  async put<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }
}

export const api = new ApiClient(API_URL);

// ==================== AUTH ====================

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'pengurus' | 'anggota';
  member_id?: string;
  member?: {
    id: string;
    nama_lengkap: string;
    no_hp: string;
    id_anggota: string;
  };
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const result = await api.post<LoginResponse>('/api/auth/login', { email, password });
    if (result.data) {
      localStorage.setItem('access_token', result.data.accessToken);
      localStorage.setItem('refresh_token', result.data.refreshToken);
    }
    return result;
  },

  async register(email: string, password: string, role?: string): Promise<ApiResponse<LoginResponse>> {
    const result = await api.post<LoginResponse>('/api/auth/register', { email, password, role });
    if (result.data) {
      localStorage.setItem('access_token', result.data.accessToken);
      localStorage.setItem('refresh_token', result.data.refreshToken);
    }
    return result;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/api/auth/logout', { refreshToken });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async refresh(): Promise<ApiResponse<{ user: AuthUser; accessToken: string }>> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { error: 'No refresh token' };
    }

    const result = await api.post<{ user: AuthUser; accessToken: string }>('/api/auth/refresh', { refreshToken });
    if (result.data) {
      localStorage.setItem('access_token', result.data.accessToken);
    }
    return result;
  },

  async getMe(): Promise<ApiResponse<AuthUser>> {
    return api.get<AuthUser>('/api/auth/me');
  },

  async changePassword(newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return api.post('/api/auth/change-password', { newPassword });
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
};

// ==================== MEMBERS ====================

export interface Member {
  id: string;
  id_anggota?: string;
  nama_lengkap: string;
  nik: string;
  alamat: string;
  no_hp: string;
  status_keanggotaan: 'aktif' | 'non_aktif' | 'pending';
  tanggal_masuk: string;
  jabatan: string;
  foto?: string;
  created_at: string;
  updated_at: string;
}

export const membersApi = {
  async getAll(params?: { limit?: number; offset?: number }): Promise<ApiResponse<Member[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return api.get<Member[]>(`/api/members${queryString}`);
  },

  async getById(id: string): Promise<ApiResponse<Member>> {
    return api.get<Member>(`/api/members/${id}`);
  },

  async create(member: Partial<Member>): Promise<ApiResponse<Member>> {
    return api.post<Member>('/api/members', member);
  },

  async update(id: string, member: Partial<Member>): Promise<ApiResponse<Member>> {
    return api.put<Member>(`/api/members/${id}`, member);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/api/members/${id}`);
  }
};

// ==================== DUES ====================

export interface Due {
  id: string;
  member_id: string;
  bulan: number;
  tahun: number;
  iuran_wajib: number;
  iuran_sukarela: number;
  tanggal_bayar: string;
  status: 'lunas' | 'belum_lunas';
  created_at: string;
  updated_at: string;
  nama_lengkap?: string;
  id_anggota?: string;
}

export const duesApi = {
  async getAll(params?: { bulan?: number; tahun?: number; member_id?: string }): Promise<ApiResponse<Due[]>> {
    const query = new URLSearchParams();
    if (params?.bulan) query.append('bulan', params.bulan.toString());
    if (params?.tahun) query.append('tahun', params.tahun.toString());
    if (params?.member_id) query.append('member_id', params.member_id);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return api.get<Due[]>(`/api/dues${queryString}`);
  },

  async getById(id: string): Promise<ApiResponse<Due>> {
    return api.get<Due>(`/api/dues/${id}`);
  },

  async create(due: Partial<Due>): Promise<ApiResponse<Due>> {
    return api.post<Due>('/api/dues', due);
  },

  async update(id: string, due: Partial<Due>): Promise<ApiResponse<Due>> {
    return api.put<Due>(`/api/dues/${id}`, due);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/api/dues/${id}`);
  }
};

// ==================== LOANS ====================

export interface Loan {
  id: string;
  member_id: string;
  jumlah_pinjaman: number;
  bunga_persen: number;
  tenor_bulan: number;
  angsuran_bulanan: number;
  tanggal_pinjaman: string;
  status: 'aktif' | 'lunas' | 'pending' | 'ditolak';
  sisa_pinjaman: number;
  created_at: string;
  updated_at: string;
  nama_lengkap?: string;
  id_anggota?: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  angsuran_ke: number;
  angsuran_pokok: number;
  angsuran_bunga: number;
  total_angsuran: number;
  sisa_angsuran: number;
  tanggal_bayar: string;
  status: 'lunas' | 'terlambat' | 'belum_lunas';
  created_at: string;
}

export const loansApi = {
  async getAll(params?: { member_id?: string; status?: string }): Promise<ApiResponse<Loan[]>> {
    const query = new URLSearchParams();
    if (params?.member_id) query.append('member_id', params.member_id);
    if (params?.status) query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return api.get<Loan[]>(`/api/loans${queryString}`);
  },

  async getById(id: string): Promise<ApiResponse<Loan & { payments: LoanPayment[] }>> {
    return api.get(`/api/loans/${id}`);
  },

  async create(loan: Partial<Loan>): Promise<ApiResponse<Loan>> {
    return api.post<Loan>('/api/loans', loan);
  },

  async update(id: string, loan: Partial<Loan>): Promise<ApiResponse<Loan>> {
    return api.put<Loan>(`/api/loans/${id}`, loan);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/api/loans/${id}`);
  },

  async addPayment(loanId: string, payment: Partial<LoanPayment>): Promise<ApiResponse<LoanPayment>> {
    return api.post<LoanPayment>(`/api/loans/${loanId}/payments`, payment);
  },

  async getPayments(loanId: string): Promise<ApiResponse<LoanPayment[]>> {
    return api.get<LoanPayment[]>(`/api/loans/${loanId}/payments`);
  },

  async updatePayment(loanId: string, paymentId: string, payment: Partial<LoanPayment>): Promise<ApiResponse<LoanPayment>> {
    return api.put<LoanPayment>(`/api/loans/${loanId}/payments/${paymentId}`, payment);
  },

  async deletePayment(loanId: string, paymentId: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>(`/api/loans/${loanId}/payments/${paymentId}`);
  }
};

// ==================== EXPENSES ====================

export interface Expense {
  id: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  tanggal: string;
  bukti_pengeluaran?: string;
  status_otorisasi: 'pending' | 'approved' | 'rejected';
  created_by: string;
  authorized_by?: string;
  created_at: string;
  updated_at: string;
}

export const expensesApi = {
  async getAll(params?: { kategori?: string; status_otorisasi?: string }): Promise<ApiResponse<Expense[]>> {
    const query = new URLSearchParams();
    if (params?.kategori) query.append('kategori', params.kategori);
    if (params?.status_otorisasi) query.append('status_otorisasi', params.status_otorisasi);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return api.get<Expense[]>(`/api/expenses${queryString}`);
  },

  async getById(id: string): Promise<ApiResponse<Expense>> {
    return api.get<Expense>(`/api/expenses/${id}`);
  },

  async create(expense: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return api.post<Expense>('/api/expenses', expense);
  },

  async update(id: string, expense: Partial<Expense>): Promise<ApiResponse<Expense>> {
    return api.put<Expense>(`/api/expenses/${id}`, expense);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/api/expenses/${id}`);
  },

  async authorize(id: string, status: 'approved' | 'rejected'): Promise<ApiResponse<Expense>> {
    return api.post<Expense>(`/api/expenses/${id}/authorize`, { status });
  }
};

// ==================== DASHBOARD ====================

export interface DashboardStats {
  total_members: number;
  total_dues_this_month: number;
  total_loans_active: number;
  total_expenses_this_month: number;
}

export const dashboardApi = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get<DashboardStats>('/api/dashboard/stats');
  }
};

// ==================== USERS ====================

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'pengurus' | 'anggota';
  member_id?: string;
  member?: Member;
  created_at: string;
  updated_at?: string;
}

export const usersApi = {
  async getAll(): Promise<ApiResponse<User[]>> {
    return api.get<User[]>('/api/users');
  },

  async getById(id: string): Promise<ApiResponse<User>> {
    return api.get<User>(`/api/users/${id}`);
  },

  async create(userData: { email: string; role: string; member_id?: string }): Promise<ApiResponse<User>> {
    return api.post<User>('/api/users', userData);
  },

  async update(id: string, userData: Partial<{ email: string; role: string; member_id?: string }>): Promise<ApiResponse<User>> {
    return api.put<User>(`/api/users/${id}`, userData);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>(`/api/users/${id}`);
  }
};

// ==================== REPORTS ====================

export interface FinancialReport {
  id: string;
  periode_start: string;
  periode_end: string;
  tipe_laporan: 'bulanan' | 'triwulan' | 'tahunan';
  total_pemasukan: number;
  total_pengeluaran: number;
  saldo_akhir: number;
  report_data?: any;
  data_source?: string;
  transaction_count?: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface GenerateReportRequest {
  periode_start: string;
  periode_end: string;
  tipe_laporan: 'bulanan' | 'triwulan' | 'tahunan';
}

export const reportsApi = {
  async getAll(): Promise<ApiResponse<FinancialReport[]>> {
    return api.get<FinancialReport[]>('/api/reports');
  },

  async getById(id: string): Promise<ApiResponse<FinancialReport>> {
    return api.get<FinancialReport>(`/api/reports/${id}`);
  },

  async generate(data: GenerateReportRequest): Promise<ApiResponse<any>> {
    return api.post<any>('/api/reports/generate', data);
  },

  async create(reportData: Partial<FinancialReport>): Promise<ApiResponse<FinancialReport>> {
    return api.post<FinancialReport>('/api/reports', reportData);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>(`/api/reports/${id}`);
  }
};

export default api;
