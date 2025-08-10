import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { LoanPayment, Loan, Member } from '../../types'

export const loanPaymentSchema = yup.object({
  loan_id: yup.string().required('Pinjaman wajib diisi'),
  angsuran_ke: yup.number().min(1).required('Angsuran ke wajib diisi'),
  angsuran_pokok: yup.number().min(0).required('Angsuran pokok wajib diisi'),
  angsuran_bunga: yup.number().min(0).optional(),
  total_angsuran: yup.number().min(0).required('Total angsuran wajib diisi'),
  tanggal_bayar: yup.string().required('Tanggal bayar wajib diisi'),
  status: yup.mixed<'lunas' | 'terlambat'>().oneOf(['lunas', 'terlambat']).required(),
}).required()

export type LoanPaymentFormValues = yup.InferType<typeof loanPaymentSchema>

export function LoanPaymentForm({
  initial,
  loans,
  onSubmit,
  onCancel,
}: {
  initial?: LoanPayment & { loan?: Loan & { member?: Member } }
  loans: (Loan & { member?: Member })[]
  onSubmit: (values: LoanPaymentFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const [selectedLoan, setSelectedLoan] = useState<Loan & { member?: Member } | null>(null)
  const [nextAngsuranKe, setNextAngsuranKe] = useState(1)

  const defaultValues: Partial<LoanPaymentFormValues> = initial
    ? {
        loan_id: initial.loan_id,
        angsuran_ke: initial.angsuran_ke,
        angsuran_pokok: Number(initial.angsuran_pokok),
        angsuran_bunga: Number(initial.angsuran_bunga || 0),
        total_angsuran: Number(initial.total_angsuran),
        tanggal_bayar: initial.tanggal_bayar.slice(0, 10),
        status: initial.status,
      }
    : {
        angsuran_pokok: 0,
        angsuran_bunga: 0,
        total_angsuran: 0,
        tanggal_bayar: new Date().toISOString().slice(0, 10),
        status: 'lunas',
      }

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoanPaymentFormValues>({
    resolver: yupResolver(loanPaymentSchema),
    defaultValues: defaultValues as any,
  })

  const watchedLoanId = watch('loan_id')
  const watchedAngsuranPokok = watch('angsuran_pokok')
  const watchedAngsuranBunga = watch('angsuran_bunga')

  // Update selected loan when loan_id changes
  useEffect(() => {
    if (watchedLoanId) {
      const loan = loans.find(l => l.id === watchedLoanId)
      setSelectedLoan(loan || null)
      
      if (loan && !initial) {
        // Calculate suggested values for new payment
        const angsuranBulanan = Number(loan.angsuran_bulanan)
        const bungaPersen = Number(loan.bunga_persen)
        const sisaPinjaman = Number(loan.sisa_pinjaman)
        
        // Simple calculation: assume equal principal payments
        const angsuranPokok = Math.min(angsuranBulanan, sisaPinjaman)
        const angsuranBunga = (sisaPinjaman * bungaPersen / 100) / 12
        
        setValue('angsuran_pokok', Math.round(angsuranPokok))
        setValue('angsuran_bunga', Math.round(angsuranBunga))
        setValue('total_angsuran', Math.round(angsuranPokok + angsuranBunga))
      }
    }
  }, [watchedLoanId, loans, setValue, initial])

  // Auto-calculate total when pokok or bunga changes
  useEffect(() => {
    const pokok = Number(watchedAngsuranPokok) || 0
    const bunga = Number(watchedAngsuranBunga) || 0
    setValue('total_angsuran', pokok + bunga)
  }, [watchedAngsuranPokok, watchedAngsuranBunga, setValue])

  useEffect(() => {
    if (initial) {
      setValue('loan_id', initial.loan_id)
      setValue('angsuran_ke', initial.angsuran_ke)
      setValue('angsuran_pokok', Number(initial.angsuran_pokok))
      setValue('angsuran_bunga', Number(initial.angsuran_bunga || 0))
      setValue('total_angsuran', Number(initial.total_angsuran))
      setValue('tanggal_bayar', initial.tanggal_bayar.slice(0, 10))
      setValue('status', initial.status)
    }
  }, [initial, setValue])

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return months[month - 1] || ''
  }

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pinjaman</label>
          <select {...register('loan_id')} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Pilih Pinjaman...</option>
            {loans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.member?.nama_lengkap} - Rp {Number(loan.jumlah_pinjaman).toLocaleString('id-ID')} 
                (Sisa: Rp {Number(loan.sisa_pinjaman).toLocaleString('id-ID')})
              </option>
            ))}
          </select>
          {errors.loan_id && <p className="text-xs text-red-600 mt-1">{errors.loan_id.message}</p>}
        </div>

        {selectedLoan && (
          <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Informasi Pinjaman</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-blue-700">Anggota:</span>
                <p className="font-medium">{selectedLoan.member?.nama_lengkap}</p>
              </div>
              <div>
                <span className="text-blue-700">Jumlah Pinjaman:</span>
                <p className="font-medium">Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <span className="text-blue-700">Sisa Pinjaman:</span>
                <p className="font-medium">Rp {Number(selectedLoan.sisa_pinjaman).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <span className="text-blue-700">Angsuran Bulanan:</span>
                <p className="font-medium">Rp {Number(selectedLoan.angsuran_bulanan).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Angsuran Ke</label>
          <input
            type="number"
            min="1"
            {...register('angsuran_ke')}
            className="w-full px-3 py-2 border rounded-lg"
          />
          {errors.angsuran_ke && <p className="text-xs text-red-600 mt-1">{errors.angsuran_ke.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
          <input
            type="date"
            {...register('tanggal_bayar')}
            className="w-full px-3 py-2 border rounded-lg"
          />
          {errors.tanggal_bayar && <p className="text-xs text-red-600 mt-1">{errors.tanggal_bayar.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Angsuran Pokok</label>
          <input
            type="number"
            min="0"
            step="1000"
            {...register('angsuran_pokok')}
            className="w-full px-3 py-2 border rounded-lg"
          />
          {errors.angsuran_pokok && <p className="text-xs text-red-600 mt-1">{errors.angsuran_pokok.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Angsuran Bunga</label>
          <input
            type="number"
            min="0"
            step="1000"
            {...register('angsuran_bunga')}
            className="w-full px-3 py-2 border rounded-lg"
          />
          {errors.angsuran_bunga && <p className="text-xs text-red-600 mt-1">{errors.angsuran_bunga.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Angsuran</label>
          <input
            type="number"
            min="0"
            step="1000"
            {...register('total_angsuran')}
            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
            readOnly
          />
          {errors.total_angsuran && <p className="text-xs text-red-600 mt-1">{errors.total_angsuran.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register('status')} className="w-full px-3 py-2 border rounded-lg">
            <option value="lunas">Lunas</option>
            <option value="terlambat">Terlambat</option>
          </select>
          {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : (initial ? 'Perbarui' : 'Simpan')}
        </button>
      </div>
    </form>
  )
}