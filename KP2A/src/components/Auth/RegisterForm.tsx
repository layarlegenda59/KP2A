import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'
import ThemeToggle from '../UI/ThemeToggle'
import { LoadingButton } from '../UI/LoadingSpinner'

interface RegisterFormProps {
  onBackToLogin: () => void
}

export function RegisterForm({ onBackToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: '',
    role: 'anggota' as 'admin' | 'pengurus' | 'anggota'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter')
      setLoading(false)
      return
    }

    if (!formData.full_name.trim()) {
      setError('Nama lengkap harus diisi')
      setLoading(false)
      return
    }

    try {
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        role: formData.role
      })
      
      if (signUpError) {
        setError(signUpError)
      } else {
        setSuccess('Registrasi berhasil! Anda akan diarahkan ke dashboard.')
        setTimeout(() => {
          // User will be automatically redirected by AuthContext after successful login
        }, 2000)
      }
    } catch (error: any) {
      setError('Terjadi kesalahan saat registrasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors">
      {/* Theme Toggle - Positioned at top right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md transition-colors">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <FaUser className="h-8 w-8 text-white" />
          </div>
          <h1 className="heading-2 text-primary">Registrasi</h1>
          <p className="body-medium text-secondary mt-2">Buat akun baru untuk KP2A Cimahi</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500 text-green-700 dark:text-green-400 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-group-compact">
            <label className="form-label">
              <FaUser className="inline mr-2" />
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input focus-ring w-full"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              <FaEnvelope className="inline mr-2" />
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input focus-ring w-full"
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              <FaPhone className="inline mr-2" />
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input focus-ring w-full"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              <FaMapMarkerAlt className="inline mr-2" />
              Alamat
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="textarea focus-ring w-full"
              placeholder="Masukkan alamat lengkap"
              rows={2}
            />
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'pengurus' | 'anggota' })}
              className="select focus-ring w-full"
            >
              <option value="anggota">Anggota</option>
              <option value="pengurus">Pengurus</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              <FaLock className="inline mr-2" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input focus-ring w-full pr-12"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="form-group-compact">
            <label className="form-label">
              <FaLock className="inline mr-2" />
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input focus-ring w-full pr-12"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            className="btn btn-primary w-full"
          >
            Daftar
          </LoadingButton>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-link hover:text-primary font-medium transition-colors"
            >
              Kembali ke Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}