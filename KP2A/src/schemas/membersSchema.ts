import * as yup from 'yup'

export const membersSchema = yup.object({
  id_anggota: yup.string().optional(),
  nama_lengkap: yup.string().required('Nama wajib diisi'),
  nik: yup.string().required('NIK wajib diisi').min(8, 'NIK tidak valid'),
  alamat: yup.string().required('Alamat wajib diisi'),
  no_hp: yup.string().required('No HP wajib diisi'),
  status_keanggotaan: yup.mixed<'aktif' | 'non_aktif' | 'pending'>().oneOf(['aktif', 'non_aktif', 'pending']).required(),
  tanggal_masuk: yup.string().required('Tanggal masuk wajib diisi'),
  jabatan: yup.string().required('Jabatan wajib diisi'),
}).required()

export type MembersFormValues = yup.InferType<typeof membersSchema>