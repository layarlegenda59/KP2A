import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { handleNumberInputChange, formatInitialValue } from '../../utils/numberFormat'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'

export interface CashBookFormValues {
  type: 'debit' | 'credit'
  kategori: string
  deskripsi: string
  jumlah: number
  tanggal: string
  status_otorisasi: 'pending' | 'paid' | 'overdue'
}

const cashBookSchema = yup.object().shape({
  type: yup.string().required('Tipe transaksi harus dipilih').oneOf(['debit', 'credit'] as const),
  kategori: yup.string().required('Kategori harus dipilih'),
  deskripsi: yup.string().required('Deskripsi harus diisi'),
  jumlah: yup.number().required('Jumlah harus diisi').positive('Jumlah harus lebih dari 0'),
  tanggal: yup.string().required('Tanggal harus diisi'),
  status_otorisasi: yup.string().required('Status harus dipilih'),
})

export function CashBookForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CashBookFormValues>
  onSubmit: (values: CashBookFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const [selectedType, setSelectedType] = useState<'debit' | 'credit'>('debit')

  const defaultValues: Partial<CashBookFormValues> = initial
    ? {
      type: (initial.type as 'debit' | 'credit') || 'debit',
      kategori: initial.kategori || 'Operasional',
      deskripsi: initial.deskripsi || '',
      jumlah: Number(initial.jumlah) || 0,
      tanggal: initial.tanggal?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      status_otorisasi: initial.status_otorisasi || 'pending',
    }
    : {
      type: 'debit',
      kategori: 'Operasional',
      deskripsi: '',
      jumlah: 0,
      tanggal: new Date().toISOString().slice(0, 10),
      status_otorisasi: 'pending',
    }

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(cashBookSchema) as any,
    defaultValues: defaultValues as any,
  })

  const watchType = watch('type')

  useEffect(() => {
    setSelectedType(watchType)
  }, [watchType])

  useEffect(() => {
    if (initial) {
      ; (
        [
          ['type', initial.type],
          ['kategori', initial.kategori],
          ['deskripsi', initial.deskripsi],
          ['jumlah', Number(initial.jumlah)],
          ['tanggal', initial.tanggal?.slice(0, 10)],
          ['status_otorisasi', initial.status_otorisasi],
        ] as const
      ).forEach(([k, v]) => setValue(k as any, v as any))
    }
  }, [initial, setValue])

  const debitCategories = ['Operasional', 'Administrasi', 'Transport', 'Konsumsi', 'Utilitas', 'Maintenance', 'Lainnya']
  const creditCategories = ['Iuran Anggota', 'Jasa', 'Denda', 'Penjualan', 'Donasi', 'Lainnya']

  const categories = selectedType === 'debit' ? debitCategories : creditCategories

  return (
    <form onSubmit={handleSubmit(async (values: any) => { await onSubmit(values) })} className="space-y-5">
      {/* Type Selection */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Tipe Transaksi</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue('type', 'debit')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-semibold ${selectedType === 'debit'
              ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 shadow-md'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-700'
              }`}
          >
            <FaArrowDown className="h-4 w-4" />
            Debit
          </button>
          <button
            type="button"
            onClick={() => setValue('type', 'credit')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-semibold ${selectedType === 'credit'
              ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200 shadow-md'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-green-300 dark:hover:border-green-700'
              }`}
          >
            <FaArrowUp className="h-4 w-4" />
            Kredit
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kategori */}
        <div className="form-group-compact">
          <label className="form-label">
            Kategori {selectedType === 'debit' ? '(Pengeluaran)' : '(Pemasukan)'}
          </label>
          <select {...register('kategori')} className="select focus-ring w-full">
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.kategori && <p className="form-error">{typeof errors.kategori === 'string' ? errors.kategori : (errors.kategori as any)?.message}</p>}
        </div>

        {/* Tanggal */}
        <div className="form-group-compact">
          <label className="form-label">Tanggal</label>
          <input
            type="date"
            {...register('tanggal')}
            className="input focus-ring w-full"
          />
          {errors.tanggal && <p className="form-error">{typeof errors.tanggal === 'string' ? errors.tanggal : (errors.tanggal as any)?.message}</p>}
        </div>

        {/* Deskripsi - Full Width */}
        <div className="md:col-span-2 form-group-compact">
          <label className="form-label">Deskripsi</label>
          <textarea
            {...register('deskripsi')}
            rows={3}
            className="input focus-ring w-full resize-none"
            placeholder={selectedType === 'debit' ? 'Masukkan deskripsi pengeluaran' : 'Masukkan deskripsi pemasukan'}
          />
          {errors.deskripsi && <p className="form-error">{typeof errors.deskripsi === 'string' ? errors.deskripsi : (errors.deskripsi as any)?.message}</p>}
        </div>

        {/* Jumlah */}
        <div className="form-group-compact">
          <label className="form-label flex items-center gap-2">
            <span>Jumlah</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${selectedType === 'debit'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}>
              {selectedType === 'debit' ? 'Keluar' : 'Masuk'}
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400">Rp</span>
            <input
              type="text"
              defaultValue={formatInitialValue(defaultValues.jumlah)}
              onChange={(e) => handleNumberInputChange(e, (name: string, value: any) => setValue(name as any, value), 'jumlah')}
              className="input focus-ring w-full pl-8"
              placeholder="0"
            />
          </div>
          {errors.jumlah && <p className="form-error">{typeof errors.jumlah === 'string' ? errors.jumlah : (errors.jumlah as any)?.message}</p>}
        </div>

        {/* Status */}
        <div className="form-group-compact">
          <label className="form-label">Status</label>
          <select {...register('status_otorisasi')} className="select focus-ring w-full">
            <option value="pending">Menunggu</option>
            <option value="paid">Sudah Bayar</option>
            <option value="overdue">Terlambat</option>
          </select>
          {errors.status_otorisasi && <p className="form-error">{typeof errors.status_otorisasi === 'string' ? errors.status_otorisasi : (errors.status_otorisasi as any)?.message}</p>}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
        >
          Batal
        </button>
        <button
          disabled={isSubmitting}
          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${selectedType === 'debit'
            ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
            : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
            }`}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>

      {/* Info Box */}
      <div className={`p-3 rounded-lg text-sm ${selectedType === 'debit'
        ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
        }`}>
        {selectedType === 'debit'
          ? '📤 Debit: Untuk mencatat uang yang keluar atau pengeluaran'
          : '📥 Kredit: Untuk mencatat uang yang masuk atau pemasukan'}
      </div>
    </form>
  )
}
