import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Member } from '../../types'
import { LoadingButton } from '../UI/LoadingSpinner'
import { PageTransition, AnimatedButton } from '../UI/AnimatedComponents'
import { membersSchema, type MembersFormValues } from '../../schemas/membersSchema'

export type MemberFormValues = MembersFormValues

export function MemberForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Member
  onSubmit: (values: MemberFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: yupResolver(membersSchema),
    defaultValues: initial
      ? {
          nama_lengkap: initial.nama_lengkap,
          nik: initial.nik,
          alamat: initial.alamat,
          no_hp: initial.no_hp,
          status_keanggotaan: initial.status_keanggotaan,
          tanggal_masuk: initial.tanggal_masuk,
          jabatan: initial.jabatan,
        }
      : {
          status_keanggotaan: 'aktif',
          tanggal_masuk: new Date().toISOString().slice(0, 10),
        } as any,
  })

  useEffect(() => {
    if (initial) {
      ;(
        [
          ['nama_lengkap', initial.nama_lengkap],
          ['nik', initial.nik],
          ['alamat', initial.alamat],
          ['no_hp', initial.no_hp],
          ['status_keanggotaan', initial.status_keanggotaan],
          ['tanggal_masuk', initial.tanggal_masuk?.slice(0, 10)],
          ['jabatan', initial.jabatan],
        ] as const
      ).forEach(([k, v]) => setValue(k as any, v as any))
    }
  }, [initial, setValue])

  return (
    <PageTransition>
      <form
        onSubmit={handleSubmit(async (values) => {
          await onSubmit(values)
        })}
        className="space-y-3"
      >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-group-compact">
          <label className="form-label">ID Anggota</label>
          <input 
            {...register('id_anggota')} 
            placeholder="Contoh: 001-KP2ACIMAHI" 
            className="input focus-ring w-full" 
          />
          {errors.id_anggota && <p className="form-error">{errors.id_anggota.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Nama Lengkap</label>
          <input 
            {...register('nama_lengkap')} 
            className="input focus-ring w-full" 
          />
          {errors.nama_lengkap && <p className="form-error">{errors.nama_lengkap.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">NIK</label>
          <input 
            {...register('nik')} 
            className="input focus-ring w-full" 
          />
          {errors.nik && <p className="form-error">{errors.nik.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Alamat</label>
          <textarea 
            {...register('alamat')} 
            className="textarea focus-ring w-full" 
            rows={2}
            placeholder="Masukkan alamat lengkap"
          />
          {errors.alamat && <p className="form-error">{errors.alamat.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">No HP</label>
          <input 
            {...register('no_hp')} 
            className="input focus-ring w-full" 
            placeholder="08xxxxxxxxxx"
          />
          {errors.no_hp && <p className="form-error">{errors.no_hp.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Status</label>
          <select 
            {...register('status_keanggotaan')} 
            className="select focus-ring w-full"
          >
            <option value="aktif">Aktif</option>
            <option value="non_aktif">Non Aktif</option>
            <option value="pending">Pending</option>
          </select>
          {errors.status_keanggotaan && <p className="form-error">{errors.status_keanggotaan.message}</p>}
        </div>
        <div className="form-group-compact">
          <label className="form-label">Tanggal Masuk</label>
          <input 
            type="date" 
            {...register('tanggal_masuk')} 
            className="input focus-ring w-full" 
          />
          {errors.tanggal_masuk && <p className="form-error">{errors.tanggal_masuk.message}</p>}
        </div>
        <div className="sm:col-span-2 form-group-compact">
          <label className="form-label">Jabatan</label>
          <input 
            {...register('jabatan')} 
            className="input focus-ring w-full" 
            placeholder="Contoh: Ketua, Sekretaris, Bendahara, Anggota"
          />
          {errors.jabatan && <p className="form-error">{errors.jabatan.message}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
        <AnimatedButton 
          type="button" 
          onClick={onCancel}
          variant="secondary"
          className="w-full sm:w-auto btn btn-secondary"
        >
          Batal
        </AnimatedButton>
        <LoadingButton
           type="submit"
           loading={isSubmitting}
           className="btn btn-primary w-full sm:w-auto"
         >
           Simpan
         </LoadingButton>
      </div>
    </form>
    </PageTransition>
  )
}


