import * as yup from 'yup'

export const expensesSchema = yup.object({
  kategori: yup.string().required('Kategori wajib diisi'),
  deskripsi: yup.string().required('Deskripsi wajib diisi'),
  jumlah: yup.number().min(0).required('Jumlah wajib diisi'),
  tanggal: yup.string().required('Tanggal wajib diisi'),
  status_otorisasi: yup.mixed<'pending' | 'approved' | 'rejected'>().oneOf(['pending', 'approved', 'rejected']).required(),
}).required()

export type ExpensesFormValues = yup.InferType<typeof expensesSchema>