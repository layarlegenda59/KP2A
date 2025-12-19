import * as yup from 'yup'

export const reportsSchema = yup.object({
  tipe_laporan: yup.mixed<'bulanan' | 'triwulan' | 'tahunan'>().oneOf(['bulanan', 'triwulan', 'tahunan']).required(),
  periode_start: yup.string().required('Periode awal wajib diisi'),
  periode_end: yup.string().required('Periode akhir wajib diisi'),
  is_detailed: yup.boolean().default(false),
}).required()

export type ReportsFormValues = yup.InferType<typeof reportsSchema>