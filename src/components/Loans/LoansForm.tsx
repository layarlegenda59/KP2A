import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Loan, Member } from '../../types'

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

export function LoansForm({
  initial,
  members,
  onSubmit,
  onCancel,
}: {
  initial?: Loan
  members: Member[]
  onSubmit: (values: LoansFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const defaultValues: Partial<LoansFormValues> = initial
    ? {
        member_id: (initial as any).member_id,
        jumlah_pinjaman: Number(initial.jumlah_pinjaman),
        bunga_persen: Number(initial.bunga_persen),
        tenor_bulan: Number(initial.tenor_bulan),
        angsuran_bulanan: Number(initial.angsuran_bulanan),
        tanggal_pinjaman: (initial.tanggal_pinjaman || '').slice(0, 10),
        status: initial.status,
        sisa_pinjaman: Number(initial.sisa_pinjaman),
      }
    : {
        jumlah_pinjaman: 2000000,
        bunga_persen: 2.0,
        tenor_bulan: 12,
        angsuran_bulanan: 350000,
        tanggal_pinjaman: new Date().toISOString().slice(0, 10),
        status: 'aktif',
        sisa_pinjaman: 2000000,
      }

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoansFormValues>({
    resolver: yupResolver(loansSchema),
    defaultValues: defaultValues as any,
  })

  useEffect(() => {
    if (initial) {
      ;(
        [
          ['member_id', (initial as any).member_id],
          ['jumlah_pinjaman', Number(initial.jumlah_pinjaman)],
          ['bunga_persen', Number(initial.bunga_persen)],
          ['tenor_bulan', Number(initial.tenor_bulan)],
          ['angsuran_bulanan', Number(initial.angsuran_bulanan)],
          ['tanggal_pinjaman', (initial.tanggal_pinjaman || '').slice(0, 10)],
          ['status', initial.status],
          ['sisa_pinjaman', Number(initial.sisa_pinjaman)],
        ] as const
      ).forEach(([k, v]) => setValue(k as any, v as any))
    }
  }, [initial, setValue])

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anggota</label>
          <select {...register('member_id')} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Pilih Anggota...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.nama_lengkap}</option>
            ))}
          </select>
          {errors.member_id && <p className="text-xs text-red-600 mt-1">{errors.member_id.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pinjaman</label>
          <input type="number" {...register('jumlah_pinjaman')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.jumlah_pinjaman && <p className="text-xs text-red-600 mt-1">{errors.jumlah_pinjaman.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bunga (%)</label>
          <input type="number" step="0.01" {...register('bunga_persen')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.bunga_persen && <p className="text-xs text-red-600 mt-1">{errors.bunga_persen.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tenor (bulan)</label>
          <input type="number" {...register('tenor_bulan')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.tenor_bulan && <p className="text-xs text-red-600 mt-1">{errors.tenor_bulan.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Angsuran Bulanan</label>
          <input type="number" {...register('angsuran_bulanan')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.angsuran_bulanan && <p className="text-xs text-red-600 mt-1">{errors.angsuran_bulanan.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pinjaman</label>
          <input type="date" {...register('tanggal_pinjaman')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.tanggal_pinjaman && <p className="text-xs text-red-600 mt-1">{errors.tanggal_pinjaman.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status')} className="w-full px-3 py-2 border rounded-lg">
            <option value="aktif">Aktif</option>
            <option value="lunas">Lunas</option>
            <option value="pending">Pending</option>
            <option value="ditolak">Ditolak</option>
          </select>
          {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sisa Pinjaman</label>
          <input type="number" {...register('sisa_pinjaman')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.sisa_pinjaman && <p className="text-xs text-red-600 mt-1">{errors.sisa_pinjaman.message}</p>}
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


