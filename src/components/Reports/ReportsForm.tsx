import React from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

export const reportsSchema = yup.object({
  tipe_laporan: yup.mixed<'bulanan' | 'triwulan' | 'tahunan'>().oneOf(['bulanan', 'triwulan', 'tahunan']).required(),
  periode_start: yup.string().required('Periode awal wajib diisi'),
  periode_end: yup.string().required('Periode akhir wajib diisi'),
}).required()

export type ReportsFormValues = yup.InferType<typeof reportsSchema>

export function ReportsForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: ReportsFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const today = new Date()
  const startDefault = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const endDefault = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReportsFormValues>({
    resolver: yupResolver(reportsSchema),
    defaultValues: {
      tipe_laporan: 'bulanan',
      periode_start: startDefault,
      periode_end: endDefault,
    }
  })

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Laporan</label>
          <select {...register('tipe_laporan')} className="w-full px-3 py-2 border rounded-lg">
            <option value="bulanan">Bulanan</option>
            <option value="triwulan">Triwulan</option>
            <option value="tahunan">Tahunan</option>
          </select>
          {errors.tipe_laporan && <p className="text-xs text-red-600 mt-1">{errors.tipe_laporan.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode Awal</label>
          <input type="date" {...register('periode_start')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.periode_start && <p className="text-xs text-red-600 mt-1">{errors.periode_start.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
          <input type="date" {...register('periode_end')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.periode_end && <p className="text-xs text-red-600 mt-1">{errors.periode_end.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded border">Batal</button>
        <button disabled={isSubmitting} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Menghasilkan...' : 'Generate'}
        </button>
      </div>
    </form>
  )
}


