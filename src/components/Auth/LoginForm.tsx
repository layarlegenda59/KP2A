import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Building2, Eye, EyeOff, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface LoginFormProps {
  onShowRegister?: () => void
}

export function LoginForm({ onShowRegister }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast.success('Berhasil masuk!')
    } catch (error: any) {
      toast.error(error.message || 'Gagal masuk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-4"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <img 
                src="https://kcxerkbbxeevxixsefwr.supabase.co/storage/v1/object/sign/material/Logo%20KP2A%20-%20Picture%20Only.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MGFlMGNiNi0yZDAzLTQ3NTgtODhkMy1kNjg1OTg0MmFlOWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYXRlcmlhbC9Mb2dvIEtQMkEgLSBQaWN0dXJlIE9ubHkucG5nIiwiaWF0IjoxNzU0OTI4OTI1LCJleHAiOjE3ODY0NjQ5MjV9.v_forvNDBKJ3KD9PoPGrfpCBCxS0-1qANxT9tECXxcU" 
                alt="KP2A Logo" 
                className="w-18 h-18 object-contain"
              />
            </div>
            <img 
              src="https://kcxerkbbxeevxixsefwr.supabase.co/storage/v1/object/sign/material/Text%20-%20Login.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81MGFlMGNiNi0yZDAzLTQ3NTgtODhkMy1kNjg1OTg0MmFlOWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYXRlcmlhbC9UZXh0IC0gTG9naW4ucG5nIiwiaWF0IjoxNzU0ODkyNDc5LCJleHAiOjE3ODY0Mjg0Nzl9.EBWX6mOQES0TbaFqefDwtK70VXsEXHL7UU5NNMhObBQ" 
              alt="KP2A Cimahi" 
              className="h-11 mx-auto"
            />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Masuk...
                </div>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Register Link */}
          {onShowRegister && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Belum punya akun?</p>
              <button
                type="button"
                onClick={onShowRegister}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Daftar Akun Admin
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}