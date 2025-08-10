import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Member } from '../../types'

const schema = yup.object({
  id_anggota: yup.string().optional(),
  nama_lengkap: yup.string().required('Nama wajib diisi'),
  nik: yup.string().required('NIK wajib diisi').min(8, 'NIK tidak valid'),
  alamat: yup.string().required('Alamat wajib diisi'),
  no_hp: yup.string().required('No HP wajib diisi'),
  status_keanggotaan: yup.mixed<'aktif' | 'non_aktif' | 'pending'>().oneOf(['aktif', 'non_aktif', 'pending']).required(),
  tanggal_masuk: yup.string().required('Tanggal masuk wajib diisi'),
  jabatan: yup.string().required('Jabatan wajib diisi'),
}).required()

export type MemberFormValues = yup.InferType<typeof schema>

export function MemberForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Member
  onSubmit: (values: MemberFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: yupResolver(schema),
    defaultValues: initial
      ? {
          nama_lengkap: initial.nama_lengkap,
          nik: initial.nik,
          alamat: initial.alamat,
          no_hp: initial.no_hp,
          status_keanggotaan: initial.status_keanggotaan,
          tanggal_masuk: initial.tanggal_masuk,
          jabatan: initial.jabatan,
        }
      : {
          status_keanggotaan: 'aktif',
          tanggal_masuk: new Date().toISOString().slice(0, 10),
        } as any,
  })

  useEffect(() => {
    if (initial) {
      ;(
        [
          ['nama_lengkap', initial.nama_lengkap],
          ['nik', initial.nik],
          ['alamat', initial.alamat],
          ['no_hp', initial.no_hp],
          ['status_keanggotaan', initial.status_keanggotaan],
          ['tanggal_masuk', initial.tanggal_masuk?.slice(0, 10)],
          ['jabatan', initial.jabatan],
        ] as const
      ).forEach(([k, v]) => setValue(k as any, v as any))
    }
  }, [initial, setValue])

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values)
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Anggota</label>
          <input {...register('id_anggota')} placeholder="Contoh: 001-KP2ACIMAHI" className="w-full px-3 py-2 border rounded-lg" />
          {errors.id_anggota && <p className="text-xs text-red-600 mt-1">{errors.id_anggota.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
          <input {...register('nama_lengkap')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.nama_lengkap && <p className="text-xs text-red-600 mt-1">{errors.nama_lengkap.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
          <input {...register('nik')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.nik && <p className="text-xs text-red-600 mt-1">{errors.nik.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <input {...register('alamat')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.alamat && <p className="text-xs text-red-600 mt-1">{errors.alamat.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No HP</label>
          <input {...register('no_hp')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.no_hp && <p className="text-xs text-red-600 mt-1">{errors.no_hp.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status_keanggotaan')} className="w-full px-3 py-2 border rounded-lg">
            <option value="aktif">Aktif</option>
            <option value="non_aktif">Non Aktif</option>
            <option value="pending">Pending</option>
          </select>
          {errors.status_keanggotaan && <p className="text-xs text-red-600 mt-1">{errors.status_keanggotaan.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Masuk</label>
          <input type="date" {...register('tanggal_masuk')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.tanggal_masuk && <p className="text-xs text-red-600 mt-1">{errors.tanggal_masuk.message}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
          <input {...register('jabatan')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.jabatan && <p className="text-xs text-red-600 mt-1">{errors.jabatan.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded border">Batal</button>
        <button disabled={isSubmitting} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}


