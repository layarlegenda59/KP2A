import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FaEye, FaEyeSlash, FaUser, FaLock } from 'react-icons/fa'
import ThemeToggle from '../UI/ThemeToggle'
import { LoadingButton } from '../UI/LoadingSpinner'

interface LoginFormProps {
  onShowRegister: () => void
}

export function LoginForm({ onShowRegister }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 LoginForm: Starting login process...')
      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        console.log('❌ LoginForm: Login failed:', signInError)
        setError(signInError)
      } else {
        console.log('✅ LoginForm: Login successful, redirecting to dashboard...')
        // Redirect to dashboard after successful login
        navigate('/')
      }
    } catch (error: any) {
      console.error('❌ LoginForm: Login error:', error)
      setError('Terjadi kesalahan saat login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      {/* Theme Toggle - Positioned at top right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-40 h-40 mb-4">
              <img
                src="/Logo%20KP2A-Fix.png"
                alt="KP2A Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Logo failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group-compact">
              <label className="form-label">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input focus-ring w-full"
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group-compact">
              <label className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input focus-ring w-full pr-12"
                  placeholder="••••••••"
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

            <LoadingButton
              type="submit"
              loading={loading}
              className="btn btn-primary w-full"
            >
              Masuk
            </LoadingButton>
          </form>

          {/* Register Link */}
          {onShowRegister && (
            <div className="mt-6 text-center">
              <p className="body-small text-secondary mb-2">Belum punya akun?</p>
              <button
                type="button"
                onClick={onShowRegister}
                className="inline-flex items-center text-link hover:text-primary transition-colors"
              >
                <FaUser className="h-4 w-4 mr-1" />
                Daftar Akun Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}