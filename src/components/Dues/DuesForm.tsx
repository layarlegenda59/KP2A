import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Due, Member } from '../../types'
import { handleNumberInputChange, formatInitialValue } from '../../utils/numberFormat'
import { getDefaultDateValue } from '../../utils/dateFormat'
import { duesSchema, DuesFormValues } from '../../schemas/duesSchema'

export function DuesForm({
  initial,
  members,
  onSubmit,
  onCancel,
}: {
  initial?: Due
  members: Member[]
  onSubmit: (values: DuesFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const defaultValues: Partial<DuesFormValues> = useMemo(() => initial
    ? {
        member_id: (initial as any).member_id,
        bulan: initial.bulan,
        tahun: initial.tahun,
        iuran_wajib: Number(initial.iuran_wajib || 0),
        iuran_sukarela: Number(initial.iuran_sukarela || 0),
        simpanan_wajib: Number((initial as any).simpanan_wajib || 0),
        tanggal_bayar: getDefaultDateValue(initial.tanggal_bayar),
        status: initial.status,
      }
    : {
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear(),
        iuran_wajib: 50000,
        iuran_sukarela: 0,
        simpanan_wajib: 100000,
        tanggal_bayar: getDefaultDateValue(),
        status: 'lunas',
      }, [initial])

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<DuesFormValues>({
    resolver: yupResolver(duesSchema),
    defaultValues: defaultValues as any,
  })

  useEffect(() => {
    if (initial) {
      ;(
        [
          ['member_id', (initial as any).member_id],
          ['bulan', initial.bulan],
          ['tahun', initial.tahun],
          ['iuran_wajib', Number(initial.iuran_wajib || 0)],
          ['iuran_sukarela', Number(initial.iuran_sukarela || 0)],
          ['simpanan_wajib', Number((initial as any).simpanan_wajib || 0)],
          ['tanggal_bayar', (initial.tanggal_bayar || '').slice(0, 10)],
          ['status', initial.status],
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
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
            <select {...register('bulan')} className="w-full px-3 py-2 border rounded-lg">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errors.bulan && <p className="text-xs text-red-600 mt-1">{errors.bulan.message}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <input type="number" {...register('tahun')} className="w-full px-3 py-2 border rounded-lg" />
            {errors.tahun && <p className="text-xs text-red-600 mt-1">{errors.tahun.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Iuran Wajib</label>
          <input 
            type="text" 
            defaultValue={formatInitialValue(defaultValues.iuran_wajib)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'iuran_wajib')}
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="0"
          />
          {errors.iuran_wajib && <p className="text-xs text-red-600 mt-1">{errors.iuran_wajib.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Iuran Sukarela</label>
          <input 
            type="text" 
            defaultValue={formatInitialValue(defaultValues.iuran_sukarela)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'iuran_sukarela')}
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="0"
          />
          {errors.iuran_sukarela && <p className="text-xs text-red-600 mt-1">{errors.iuran_sukarela.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Simpanan Wajib</label>
          <input 
            type="text" 
            defaultValue={formatInitialValue(defaultValues.simpanan_wajib)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'simpanan_wajib')}
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="0"
          />
          {errors.simpanan_wajib && <p className="text-xs text-red-600 mt-1">{errors.simpanan_wajib.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
          <input type="date" {...register('tanggal_bayar')} defaultValue={defaultValues.tanggal_bayar} className="w-full px-3 py-2 border rounded-lg" />
          {errors.tanggal_bayar && <p className="text-xs text-red-600 mt-1">{errors.tanggal_bayar.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status')} className="w-full px-3 py-2 border rounded-lg">
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
          </select>
          {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>}
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


