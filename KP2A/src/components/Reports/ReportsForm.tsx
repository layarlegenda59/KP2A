import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Report } from '../../types'
import { getDefaultDateValue } from '../../utils/dateFormat'
import { reportsSchema, ReportsFormValues } from '../../schemas/reportsSchema'

export function ReportsForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: ReportsFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const defaultValues = useMemo(() => ({
    tipe_laporan: 'bulanan',
    periode_start: getDefaultDateValue(),
    periode_end: getDefaultDateValue(),
    is_detailed: false,
  }), [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReportsFormValues>({
    resolver: yupResolver(reportsSchema),
    defaultValues
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
          <input type="date" {...register('periode_start')} defaultValue={defaultValues.periode_start} className="w-full px-3 py-2 border rounded-lg" />
          {errors.periode_start && <p className="text-xs text-red-600 mt-1">{errors.periode_start.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
          <input type="date" {...register('periode_end')} defaultValue={defaultValues.periode_end} className="w-full px-3 py-2 border rounded-lg" />
          {errors.periode_end && <p className="text-xs text-red-600 mt-1">{errors.periode_end.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_detailed')} id="is_detailed" className="rounded" />
        <label htmlFor="is_detailed" className="text-sm text-gray-700">Laporan Terperinci (tampilkan semua transaksi)</label>
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


