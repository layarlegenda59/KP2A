import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Expense } from '../../types'
import { handleNumberInputChange, formatInitialValue } from '../../utils/numberFormat'
import { expensesSchema, ExpensesFormValues } from '../../schemas/expensesSchema'

export function ExpensesForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Expense
  onSubmit: (values: ExpensesFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const defaultValues: Partial<ExpensesFormValues> = initial
    ? {
        kategori: initial.kategori,
        deskripsi: initial.deskripsi,
        jumlah: Number(initial.jumlah),
        tanggal: (initial.tanggal || '').slice(0, 10),
        status_otorisasi: initial.status_otorisasi,
      }
    : {
        kategori: 'Operasional',
        deskripsi: '',
        jumlah: 0,
        tanggal: new Date().toISOString().slice(0, 10),
        status_otorisasi: 'pending',
      }

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ExpensesFormValues>({
    resolver: yupResolver(expensesSchema),
    defaultValues: defaultValues as any,
  })

  useEffect(() => {
    if (initial) {
      ;(
        [
          ['kategori', initial.kategori],
          ['deskripsi', initial.deskripsi],
          ['jumlah', Number(initial.jumlah)],
          ['tanggal', (initial.tanggal || '').slice(0, 10)],
          ['status_otorisasi', initial.status_otorisasi],
        ] as const
      ).forEach(([k, v]) => setValue(k as any, v as any))
    }
  }, [initial, setValue])

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select {...register('kategori')} className="w-full px-3 py-2 border rounded-lg">
            <option value="Operasional">Operasional</option>
            <option value="Transport">Transport</option>
            <option value="Konsumsi">Konsumsi</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          {errors.kategori && <p className="text-xs text-red-600 mt-1">{errors.kategori.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input type="date" {...register('tanggal')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.tanggal && <p className="text-xs text-red-600 mt-1">{errors.tanggal.message}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
          <input {...register('deskripsi')} className="w-full px-3 py-2 border rounded-lg" />
          {errors.deskripsi && <p className="text-xs text-red-600 mt-1">{errors.deskripsi.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
          <input 
            type="text" 
            defaultValue={formatInitialValue(defaultValues.jumlah)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'jumlah')}
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="0"
          />
          {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status_otorisasi')} className="w-full px-3 py-2 border rounded-lg">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {errors.status_otorisasi && <p className="text-xs text-red-600 mt-1">{errors.status_otorisasi.message}</p>}
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


