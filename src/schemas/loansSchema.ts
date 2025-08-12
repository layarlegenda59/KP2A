import * as yup from 'yup'

export const loansSchema = yup.object({
  member_id: yup.string().required('Anggota wajib diisi'),
  jumlah_pinjaman: yup.number().min(0).required('Jumlah pinjaman wajib diisi'),
  bunga_persen: yup.number().min(0).required('Bunga wajib diisi'),
  tenor_bulan: yup.number().min(1).required('Tenor wajib diisi'),
  angsuran_bulanan: yup.number().min(0).required('Angsuran wajib diisi'),
  tanggal_pinjaman: yup.string().required('Tanggal wajib diisi'),
  status: yup.mixed<'aktif' | 'lunas' | 'pending' | 'ditolak'>().oneOf(['aktif', 'lunas', 'pending', 'ditolak']).required(),
  sisa_pinjaman: yup.number().min(0).required('Sisa pinjaman wajib diisi'),
}).required()

export type LoansFormValues = yup.InferType<typeof loansSchema>