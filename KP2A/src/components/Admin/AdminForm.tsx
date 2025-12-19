import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { User, Member } from '../../types'
import { isDatabaseAvailable, databaseClient, withTimeout } from '../../lib/database'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const createSchema = (isEdit: boolean) => yup.object({
  email: yup.string().email('Email tidak valid').required('Email wajib diisi'),
  password: isEdit 
    ? yup.string().optional()
    : yup.string().min(6, 'Password minimal 6 karakter').required('Password wajib diisi'),
  role: yup.mixed<'admin' | 'pengurus' | 'anggota'>().oneOf(['admin', 'pengurus', 'anggota']).required('Role wajib dipilih'),
  member_id: yup.string().optional().nullable(),
}).required()

export type AdminFormValues = yup.InferType<ReturnType<typeof createSchema>>

interface AdminFormProps {
  initialData?: User | null
  onSubmit: (values: AdminFormValues) => Promise<void>
  onCancel: () => void
}

export function AdminForm({ initialData, onSubmit, onCancel }: AdminFormProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  
  const isEdit = !!initialData
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<AdminFormValues>({
    resolver: yupResolver(createSchema(isEdit)),
    defaultValues: {
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'anggota',
      member_id: initialData?.member_id || null,
    }
  })

  const selectedRole = watch('role')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Koneksi database tidak tersedia')
      }

      const { data, error } = await withTimeout(
        databaseClient
          .from('members')
          .select('*')
          .eq('status_keanggotaan', 'aktif')
          .order('nama_lengkap')
          ,
        8000,
        'fetch members'
      )

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const onSubmitForm = async (values: AdminFormValues) => {
    setLoading(true)
    try {
      await onSubmit(values)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3">
      <div className="form-group-compact">
        <label className="form-label">
          Email *
        </label>
        <input
          type="email"
          {...register('email')}
          className="input focus-ring w-full"
          placeholder="user@kp2acimahi.com"
        />
        {errors.email && (
          <p className="form-error">{errors.email.message}</p>
        )}
      </div>

      {!isEdit && (
        <div className="form-group-compact">
          <label className="form-label">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="input focus-ring w-full pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors"
            >
              {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>
      )}

      <div className="form-group-compact">
        <label className="form-label">
          Role *
        </label>
        <select
          {...register('role')}
          className="input focus-ring w-full"
        >
          <option value="anggota">Anggota</option>
          <option value="pengurus">Pengurus</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && (
          <p className="form-error">{errors.role.message}</p>
        )}
      </div>

      {(selectedRole === 'anggota' || selectedRole === 'pengurus') && (
        <div className="form-group-compact">
          <label className="form-label">
            Anggota Terkait
          </label>
          {loadingMembers ? (
            <div className="input w-full bg-surface">
              <div className="animate-pulse text-secondary">Memuat anggota...</div>
            </div>
          ) : (
            <select
              {...register('member_id')}
              className="input focus-ring w-full"
            >
              <option value="">Pilih anggota (opsional)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nama_lengkap} - {member.id_anggota}
                </option>
              ))}
            </select>
          )}
          <p className="form-help">
            Hubungkan akun dengan data anggota yang sudah ada
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEdit ? 'Memperbarui...' : 'Membuat...'}
            </div>
          ) : (
            isEdit ? 'Perbarui' : 'Buat'
          )}
        </button>
      </div>
    </form>
  )
}