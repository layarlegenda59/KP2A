import * as yup from 'yup'

export const loanPaymentSchema = yup.object({
  loan_id: yup.string().required('Pinjaman wajib diisi'),
  angsuran_ke: yup.number().min(1).required('Angsuran ke wajib diisi'),
  angsuran_pokok: yup.number().min(0).required('Angsuran pokok wajib diisi'),
  angsuran_bunga: yup.number().min(0).optional(),
  sisa_angsuran: yup.number().min(0).required('Sisa angsuran wajib diisi'),
  tanggal_bayar: yup.string().required('Tanggal bayar wajib diisi'),
  status: yup.mixed<'lunas' | 'belum_lunas' | 'terlambat'>().oneOf(['lunas', 'belum_lunas', 'terlambat']).default('lunas'),
}).required()

export type LoanPaymentFormValues = yup.InferType<typeof loanPaymentSchema>
