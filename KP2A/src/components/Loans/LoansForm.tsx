import React, { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { FaChevronDown, FaCheck } from 'react-icons/fa'
import { Loan, Member } from '../../types'
import { handleNumberInputChange, formatInitialValue, formatNumberWithSeparator } from '../../utils/numberFormat'
import { getDefaultDateValue } from '../../utils/dateFormat'
import { loansSchema, LoansFormValues } from '../../schemas/loansSchema'

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
  const [query, setQuery] = useState('')

  const defaultValues = useMemo(() => ({
    member_id: initial?.member_id || '',
    jumlah_pinjaman: initial?.jumlah_pinjaman ? formatInitialValue(initial.jumlah_pinjaman) : 0,
    bunga_persen: initial?.bunga_persen || 0,
    tenor_bulan: initial?.tenor_bulan || 10,
    angsuran_bulanan: initial?.angsuran_bulanan ? formatInitialValue(initial.angsuran_bulanan) : 0,
    tanggal_pinjaman: getDefaultDateValue(initial?.tanggal_pinjaman),
    status: initial?.status || 'aktif',
  }), [initial])

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<LoansFormValues>({
    resolver: yupResolver(loansSchema),
    defaultValues: defaultValues as any,
  })

  const filteredMembers =
    query === ''
      ? members
      : members.filter((member) => {
        return (member.nama_lengkap || '').toLowerCase().includes(query.toLowerCase())
      })

  // Watch fields for auto-calculation
  const jumlahPinjaman = watch('jumlah_pinjaman')
  const tenorBulan = watch('tenor_bulan')

  // Auto-calculate Angsuran Bulanan when Jumlah Pinjaman or Tenor changes
  useEffect(() => {
    if (jumlahPinjaman && tenorBulan) {
      const numJumlah = typeof jumlahPinjaman === 'string'
        ? parseInt(jumlahPinjaman.replace(/\D/g, '')) || 0
        : jumlahPinjaman
      const numTenor = typeof tenorBulan === 'string' ? parseInt(tenorBulan) : tenorBulan

      if (numJumlah > 0 && numTenor > 0) {
        const angsuran = Math.round(numJumlah / numTenor)
        setValue('angsuran_bulanan', angsuran)
      }
    }
  }, [jumlahPinjaman, tenorBulan, setValue])

  useEffect(() => {
    if (initial) {
      // Set form values and update input display for number fields
      setValue('member_id', (initial as any).member_id)
      setValue('jumlah_pinjaman', Number(initial.jumlah_pinjaman))
      setValue('bunga_persen', Number(initial.bunga_persen))
      setValue('tenor_bulan', Number(initial.tenor_bulan))
      setValue('angsuran_bulanan', Number(initial.angsuran_bulanan))
      setValue('tanggal_pinjaman', (initial.tanggal_pinjaman || '').slice(0, 10))
      setValue('status', initial.status)

      // Update input display values for formatted number fields
      const jumlahInput = document.querySelector('input[placeholder="0"]') as HTMLInputElement
      if (jumlahInput && initial.jumlah_pinjaman) {
        jumlahInput.value = formatNumberWithSeparator(Number(initial.jumlah_pinjaman))
      }

      const angsuranInputs = document.querySelectorAll('input[placeholder="0"]') as NodeListOf<HTMLInputElement>
      if (angsuranInputs.length > 1 && initial.angsuran_bulanan) {
        angsuranInputs[1].value = formatNumberWithSeparator(Number(initial.angsuran_bulanan))
      }
    }
  }, [initial, setValue])

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anggota with Combobox */}
        <div className="form-group relative">
          <label className="form-label">Anggota</label>
          <Controller
            control={control}
            name="member_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onChange={(val) => field.onChange(val)}
                onClose={() => setQuery('')}
              >
                <div className="relative">
                  <div className="relative w-full">
                    <ComboboxInput
                      className="input focus-ring w-full pr-10"
                      displayValue={(memberId: string) => {
                        const member = members.find((m) => m.id === memberId)
                        return member ? member.nama_lengkap : ''
                      }}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari anggota..."
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <FaChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </ComboboxButton>
                  </div>
                  <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-[100]">
                    {filteredMembers.length === 0 && query !== '' ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-200">
                        Tidak ditemukan.
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <ComboboxOption
                          key={member.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                            }`
                          }
                          value={member.id}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                  }`}
                              >
                                {member.nama_lengkap}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'
                                    }`}
                                >
                                  <FaCheck className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </ComboboxOption>
                      ))
                    )}
                  </ComboboxOptions>
                </div>
              </Combobox>
            )}
          />
          {errors.member_id && <p className="form-error">{errors.member_id.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Jumlah Pinjaman</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.jumlah_pinjaman)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'jumlah_pinjaman')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.jumlah_pinjaman && <p className="form-error">{errors.jumlah_pinjaman.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Jasa (%)</label>
          <input type="number" step="0.01" defaultValue="0" {...register('bunga_persen')} className="input focus-ring w-full" />
          {errors.bunga_persen && <p className="form-error">{errors.bunga_persen.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Tenor (bulan)</label>
          <input type="number" defaultValue="10" {...register('tenor_bulan')} className="input focus-ring w-full" />
          {errors.tenor_bulan && <p className="form-error">{errors.tenor_bulan.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Angsuran Bulanan</label>
          <input
            type="text"
            value={formatNumberWithSeparator(typeof watch('angsuran_bulanan') === 'string'
              ? parseInt((watch('angsuran_bulanan') as string).replace(/\D/g, '')) || 0
              : watch('angsuran_bulanan') || 0)}
            readOnly
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.angsuran_bulanan && <p className="form-error">{errors.angsuran_bulanan.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Tanggal Pinjaman</label>
          <input type="date" {...register('tanggal_pinjaman')} defaultValue={defaultValues.tanggal_pinjaman} className="input focus-ring w-full" />
          {errors.tanggal_pinjaman && <p className="form-error">{errors.tanggal_pinjaman.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select {...register('status')} className="input focus-ring w-full">
            <option value="aktif">Aktif</option>
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="pending">Pending</option>
            <option value="ditolak">Ditolak</option>
          </select>
          {errors.status && <p className="form-error">{errors.status.message}</p>}
        </div>

      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Batal</button>
        <button disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}


