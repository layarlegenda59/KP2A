import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { LoanPayment, Loan, Member } from '../../types'
import { handleNumberInputChange, formatInitialValue } from '../../utils/numberFormat'
import { getDefaultDateValue } from '../../utils/dateFormat'
import { loanPaymentSchema, LoanPaymentFormValues } from '../../schemas/loanPaymentSchema'

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

  const defaultValues: Partial<LoanPaymentFormValues> = useMemo(() => initial
    ? {
      loan_id: initial.loan_id,
      angsuran_ke: initial.angsuran_ke,
      angsuran_pokok: Number(initial.angsuran_pokok),
      angsuran_bunga: Number(initial.angsuran_bunga || 0),
      sisa_angsuran: Number((initial as any).sisa_angsuran || 0),
      tanggal_bayar: getDefaultDateValue(initial.tanggal_bayar),
      status: initial.status,
    }
    : {
      angsuran_pokok: 0,
      angsuran_bunga: 0,
      sisa_angsuran: 0,
      tanggal_bayar: getDefaultDateValue(),
      status: 'belum_lunas',
    }, [initial])

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoanPaymentFormValues>({
    resolver: yupResolver(loanPaymentSchema) as any,
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
        const sisaAngsuran = sisaPinjaman - angsuranPokok

        setValue('angsuran_pokok' as any, Math.round(angsuranPokok))
        setValue('angsuran_bunga' as any, Math.round(angsuranBunga))
        setValue('sisa_angsuran' as any, Math.round(Math.max(0, sisaAngsuran)))
      }
    }
  }, [watchedLoanId, loans, setValue, initial])

  // Auto-calculate sisa_angsuran when angsuran_pokok changes
  // But do NOT auto-update status - allow manual selection
  useEffect(() => {
    if (selectedLoan && !initial) {
      const pokok = Number(watchedAngsuranPokok) || 0
      const sisaPinjaman = Number(selectedLoan.sisa_pinjaman) || 0
      const sisaAngsuran = Math.max(0, sisaPinjaman - pokok)
      setValue('sisa_angsuran' as any, sisaAngsuran)
    }
  }, [watchedAngsuranPokok, selectedLoan, setValue, initial])

  useEffect(() => {
    if (initial) {
      setValue('loan_id' as any, initial.loan_id)
      setValue('angsuran_ke' as any, initial.angsuran_ke)
      setValue('angsuran_pokok' as any, Number(initial.angsuran_pokok))
      setValue('angsuran_bunga' as any, Number(initial.angsuran_bunga || 0))
      setValue('sisa_angsuran' as any, Number(initial.sisa_angsuran || 0))
      setValue('tanggal_bayar' as any, initial.tanggal_bayar.slice(0, 10))
      setValue('status' as any, initial.status)
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
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 form-group-compact">
          <label className="form-label">Pinjaman</label>
          <select {...register('loan_id')} className="select focus-ring w-full">
            <option value="">Pilih Pinjaman...</option>
            {loans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.member?.nama_lengkap} - Rp {Number(loan.jumlah_pinjaman).toLocaleString('id-ID')}{' '}(Sisa: Rp {Number(loan.sisa_pinjaman).toLocaleString('id-ID')})
              </option>
            ))}
          </select>
          {errors.loan_id && <p className="form-error">{errors.loan_id.message}</p>}
        </div>

        {selectedLoan && (
          <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Informasi Pinjaman</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Anggota:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selectedLoan.member?.nama_lengkap}</p>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Jumlah Pinjaman:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Sisa Pinjaman:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">Rp {Number(selectedLoan.sisa_pinjaman).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Angsuran Bulanan:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">Rp {Number(selectedLoan.angsuran_bulanan).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        )}

        <div className="form-group-compact">
          <label className="form-label">Angsuran Ke</label>
          <input
            type="number"
            min="1"
            {...register('angsuran_ke')}
            className="input focus-ring w-full"
          />
          {errors.angsuran_ke && <p className="form-error">{errors.angsuran_ke.message}</p>}
        </div>

        <div className="form-group-compact">
          <label className="form-label">Tanggal Bayar</label>
          <input
            type="date"
            {...register('tanggal_bayar')}
            defaultValue={defaultValues.tanggal_bayar}
            className="input focus-ring w-full"
          />
          {errors.tanggal_bayar && <p className="form-error">{errors.tanggal_bayar.message}</p>}
        </div>

        <div className="form-group-compact">
          <label className="form-label">Angsuran Pokok</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.angsuran_pokok)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'angsuran_pokok')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.angsuran_pokok && <p className="form-error">{errors.angsuran_pokok.message}</p>}
        </div>

        <div className="form-group-compact">
          <label className="form-label">Angsuran Jasa</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.angsuran_bunga)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'angsuran_bunga')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.angsuran_bunga && <p className="form-error">{errors.angsuran_bunga.message}</p>}
        </div>

        <div className="form-group-compact">
          <label className="form-label">Sisa Angsuran</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.sisa_angsuran)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'sisa_angsuran')}
            className="input focus-ring w-full bg-gray-50 dark:bg-gray-700"
            readOnly
          />
          {errors.sisa_angsuran && <p className="form-error">{errors.sisa_angsuran.message}</p>}
        </div>

        <div className="form-group-compact">
          <label className="form-label">Status</label>
          <select {...register('status')} className="select focus-ring w-full">
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="terlambat">Terlambat</option>
          </select>
          {errors.status && <p className="form-error">{errors.status.message}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onCancel} className="btn btn-secondary w-full sm:w-auto">Batal</button>
        <button disabled={isSubmitting} className="btn btn-primary w-full sm:w-auto">
          {isSubmitting ? 'Menyimpan...' : (initial ? 'Perbarui' : 'Simpan')}
        </button>
      </div>
    </form>
  )
}
