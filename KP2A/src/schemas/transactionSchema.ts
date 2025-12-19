import * as yup from 'yup'

export const transactionSchema = yup.object({
  transaction_type: yup
    .string()
    .oneOf(['income', 'expense'], 'Tipe transaksi harus income atau expense')
    .required('Tipe transaksi wajib diisi'),
  amount: yup
    .number()
    .positive('Jumlah harus lebih dari 0')
    .required('Jumlah wajib diisi'),
  transaction_date: yup
    .string()
    .required('Tanggal transaksi wajib diisi'),
  category_id: yup
    .string()
    .required('Kategori wajib dipilih'),
  description: yup
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .required('Deskripsi wajib diisi'),
  payment_method_id: yup
    .string()
    .required('Metode pembayaran wajib dipilih'),
  status: yup
    .string()
    .oneOf(['pending', 'approved', 'rejected'], 'Status tidak valid')
    .required('Status wajib diisi'),
})

export const categorySchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(100, 'Nama kategori maksimal 100 karakter')
    .required('Nama kategori wajib diisi'),
  type: yup
    .string()
    .oneOf(['income', 'expense'], 'Tipe kategori harus income atau expense')
    .required('Tipe kategori wajib diisi'),
  color_code: yup
    .string()
    .matches(/^#[0-9A-F]{6}$/i, 'Kode warna harus format hex (#RRGGBB)')
    .optional(),
  description: yup
    .string()
    .max(255, 'Deskripsi maksimal 255 karakter')
    .optional(),
})

export const paymentMethodSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nama metode pembayaran minimal 2 karakter')
    .max(100, 'Nama metode pembayaran maksimal 100 karakter')
    .required('Nama metode pembayaran wajib diisi'),
  type: yup
    .string()
    .oneOf(['cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other'], 'Tipe metode pembayaran tidak valid')
    .required('Tipe metode pembayaran wajib diisi'),
  description: yup
    .string()
    .max(255, 'Deskripsi maksimal 255 karakter')
    .optional(),
})

export type TransactionFormValues = yup.InferType<typeof transactionSchema>
export type CategoryFormValues = yup.InferType<typeof categorySchema>
export type PaymentMethodFormValues = yup.InferType<typeof paymentMethodSchema>