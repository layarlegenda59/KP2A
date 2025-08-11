import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { User, Member } from '../../types'
import { isSupabaseAvailable, supabase, withTimeout } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

const createSchema = (isEdit: boolean) => yup.object({
  email: yup.string().email('Email tidak valid').required('Email wajib diisi'),
  password: isEdit 
    ? yup.string().optional()
    : yup.string().min(6, 'Password minimal 6 karakter').required('Password wajib diisi'),
  role: yup.mixed<'admin' | 'pengurus' | 'anggota'>().oneOf(['admin', 'pengurus', 'anggota']).required('Role wajib dipilih'),
  member_id: yup.string().optional().nullable(),
}).required()

export type AdminFormValues = yup.InferType<typeof schema>

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
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Koneksi Supabase tidak tersedia')
      }

      const { data, error } = await withTimeout(
        supabase
          .from('members')
          .select('*')
          .eq('status_keanggotaan', 'aktif')
          .order('nama_lengkap'),
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
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          {...register('email')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="user@kp2acimahi.com"
        />
        {errors.email && (
          <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role *
        </label>
        <select
          {...register('role')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="anggota">Anggota</option>
          <option value="pengurus">Pengurus</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && (
          <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>
        )}
      </div>

      {(selectedRole === 'anggota' || selectedRole === 'pengurus') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anggota Terkait
          </label>
          {loadingMembers ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <div className="animate-pulse text-gray-500">Memuat anggota...</div>
            </div>
          ) : (
            <select
              {...register('member_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pilih anggota (opsional)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nama_lengkap} - {member.id_anggota}
                </option>
              ))}
            </select>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Hubungkan akun dengan data anggota yang sudah ada
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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