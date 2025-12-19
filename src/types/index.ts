export interface Member {
  id: string
  nama_lengkap: string
  nik: string
  alamat: string
  no_hp: string
  status_keanggotaan: 'aktif' | 'non_aktif' | 'pending'
  tanggal_masuk: string
  jabatan: string
  foto?: string
  created_at: string
  updated_at: string
}

export interface Due {
  id: string
  member_id: string
  bulan: number
  tahun: number
  iuran_wajib: number
  iuran_sukarela: number
  tanggal_bayar: string
  status: 'lunas' | 'belum_lunas'
  created_at: string
  updated_at: string
  member?: Member
}

export interface Loan {
  id: string
  member_id: string
  jumlah_pinjaman: number
  bunga_persen: number
  tenor_bulan: number
  angsuran_bulanan: number
  tanggal_pinjaman: string
  status: 'aktif' | 'lunas' | 'pending' | 'ditolak'
  sisa_pinjaman: number
  created_at: string
  updated_at: string
  member?: Member
}

export interface LoanPayment {
  id: string
  loan_id: string
  angsuran_ke: number
  angsuran_pokok: number
  angsuran_bunga: number
  total_angsuran: number
  tanggal_bayar: string
  status: 'lunas' | 'terlambat'
  created_at: string
  loan?: Loan
}

export interface Expense {
  id: string
  kategori: string
  deskripsi: string
  jumlah: number
  tanggal: string
  bukti_pengeluaran?: string
  status_otorisasi: 'pending' | 'approved' | 'rejected'
  created_by: string
  authorized_by?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'pengurus' | 'anggota'
  member_id?: string
  created_at: string
  member?: Member
}

export interface FinancialSummary {
  total_members: number
  total_dues_this_month: number
  total_loans_active: number
  total_expenses_this_month: number
  cash_flow: {
    income: number
    expense: number
    net: number
  }
}