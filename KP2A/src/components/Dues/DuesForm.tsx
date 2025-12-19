import React, { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
import { FaChevronDown, FaCheck } from 'react-icons/fa'
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

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<DuesFormValues>({
    resolver: yupResolver(duesSchema),
    defaultValues: defaultValues as any,
  })

  useEffect(() => {
    if (initial) {
      ; (
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

  const [query, setQuery] = React.useState('')

  const filteredMembers =
    query === ''
      ? members
      : members.filter((member) => {
        return (member.nama_lengkap || '').toLowerCase().includes(query.toLowerCase())
      })

  return (
    <form onSubmit={handleSubmit(async (values) => { await onSubmit(values) })} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-group-compact relative">
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
                                  <FaCheck className="h-4 w-4" aria-hidden="true" />
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
        <div className="flex gap-2">
          <div className="flex-1 form-group-compact">
            <label className="form-label">Bulan</label>
            <select {...register('bulan')} className="select focus-ring w-full">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errors.bulan && <p className="form-error">{errors.bulan.message}</p>}
          </div>
          <div className="flex-1 form-group-compact">
            <label className="form-label">Tahun</label>
            <input type="number" {...register('tahun')} className="input focus-ring w-full" />
            {errors.tahun && <p className="form-error">{errors.tahun.message}</p>}
          </div>
        </div>
        <div className="form-group-compact">
          <label className="form-label">Iuran Wajib</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.iuran_wajib)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'iuran_wajib')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.iuran_wajib && <p className="form-error">{errors.iuran_wajib.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Simpanan Sukarela</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.iuran_sukarela)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'iuran_sukarela')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.iuran_sukarela && <p className="form-error">{errors.iuran_sukarela.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Simpanan Wajib</label>
          <input
            type="text"
            defaultValue={formatInitialValue(defaultValues.simpanan_wajib)}
            onChange={(e) => handleNumberInputChange(e, setValue, 'simpanan_wajib')}
            className="input focus-ring w-full"
            placeholder="0"
          />
          {errors.simpanan_wajib && <p className="form-error">{errors.simpanan_wajib.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Tanggal Bayar</label>
          <input type="date" {...register('tanggal_bayar')} defaultValue={defaultValues.tanggal_bayar} className="input focus-ring w-full" />
          {errors.tanggal_bayar && <p className="form-error">{errors.tanggal_bayar.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Status</label>
          <select {...register('status')} className="select focus-ring w-full">
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
          </select>
          {errors.status && <p className="form-error">{errors.status.message}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary w-full sm:w-auto">Batal</button>
        <button disabled={isSubmitting} className="btn btn-primary w-full sm:w-auto">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}


