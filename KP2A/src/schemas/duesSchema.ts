import * as yup from 'yup'

export const duesSchema = yup.object({
  member_id: yup.string().required('Anggota wajib diisi'),
  bulan: yup.number().min(1).max(12).required('Bulan wajib diisi'),
  tahun: yup.number().min(2023).max(2100).required('Tahun wajib diisi'),
  iuran_wajib: yup.number().min(0).required('Iuran wajib wajib diisi'),
  iuran_sukarela: yup.number().min(0).required('Simpanan sukarela wajib diisi'),
  simpanan_wajib: yup.number().min(0).required('Simpanan wajib wajib diisi'),
  tanggal_bayar: yup.string().required('Tanggal bayar wajib diisi'),
  status: yup.mixed<'lunas' | 'belum_lunas'>().oneOf(['lunas', 'belum_lunas']).required(),
}).required()

export type DuesFormValues = yup.InferType<typeof duesSchema>