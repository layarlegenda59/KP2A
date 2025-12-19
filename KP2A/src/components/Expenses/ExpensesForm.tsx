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
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-group-compact">
          <label className="form-label">Kategori</label>
          <select {...register('kategori')} className="select focus-ring w-full">
            <option value="Operasional">Operasional</option>
            <option value="Transport">Transport</option>
            <option value="Konsumsi">Konsumsi</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          {errors.kategori && <p className="form-error">{errors.kategori.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Tanggal</label>
          <input type="date" {...register('tanggal')} className="input focus-ring w-full" />
          {errors.tanggal && <p className="form-error">{errors.tanggal.message}</p>}
        </div>
        <div className="md:col-span-2 form-group-compact">
          <label className="form-label">Deskripsi</label>
          <input {...register('deskripsi')} className="input focus-ring w-full" placeholder="Masukkan deskripsi pengeluaran" />
          {errors.deskripsi && <p className="form-error">{errors.deskripsi.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Jumlah</label>
          <input 
            type="text" 
            defaultValue={formatInitialValue(defaultValues.jumlah)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'jumlah')}
            className="input focus-ring w-full" 
            placeholder="Rp 0"
          />
          {errors.jumlah && <p className="form-error">{errors.jumlah.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Status</label>
          <select {...register('status_otorisasi')} className="select focus-ring w-full">
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          {errors.status_otorisasi && <p className="form-error">{errors.status_otorisasi.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 mt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Batal</button>
        <button disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}


