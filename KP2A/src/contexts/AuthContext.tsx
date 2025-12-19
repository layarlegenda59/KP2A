import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, type AuthUser } from '../lib/api'

interface AuthContextType {
  user: AuthUser | null
  userProfile: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData?: { role?: string }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<AuthUser>) => Promise<{ error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useRequireAuth must be used within an AuthProvider')
  }

  const { user, loading } = context
  const isAuthenticated = !!user && !loading
  const error = null

  return {
    user,
    loading,
    isAuthenticated,
    error
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🚀 AuthProvider: Component initialized')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 AuthContext: Initializing authentication...')

    const initializeAuth = async () => {
      try {
        if (!authApi.isAuthenticated()) {
          console.log('❌ AuthContext: No token found')
          setLoading(false)
          return
        }

        console.log('🔄 AuthContext: Refreshing session...')
        const { data, error } = await authApi.refresh()

        if (data && !error) {
          console.log('✅ AuthContext: Session refresh successful')
          setUser(data.user)
        } else {
          console.log('❌ AuthContext: Session refresh failed:', error)
          await authApi.logout()
        }
      } catch (error) {
        console.error('❌ AuthContext: Auth initialization error:', error)
        await authApi.logout()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Periodic session refresh
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 AuthContext: Periodic session refresh...')
        const { data, error } = await authApi.refresh()

        if (error) {
          console.log('❌ AuthContext: Periodic refresh failed')
          setUser(null)
          await authApi.logout()
        } else if (data) {
          console.log('✅ AuthContext: Periodic refresh successful')
          setUser(data.user)
        }
      } catch (error) {
        console.error('❌ AuthContext: Periodic refresh error:', error)
        setUser(null)
        await authApi.logout()
      }
    }, 15 * 60 * 1000) // Refresh every 15 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('🔄 AuthContext: Attempting sign in for:', email)

      const { data, error } = await authApi.login(email, password)

      if (error) {
        console.log('❌ AuthContext: Sign in failed:', error)
        return { error }
      }

      if (data) {
        console.log('✅ AuthContext: Sign in successful for:', data.user.email)
        setUser(data.user)
      }

      return {}
    } catch (error) {
      console.error('❌ AuthContext: Sign in error:', error)
      return { error: 'Terjadi kesalahan saat login. Silakan coba lagi.' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData?: { role?: string }) => {
    try {
      setLoading(true)

      const { data, error } = await authApi.register(email, password, userData?.role)

      if (error) {
        return { error }
      }

      if (data) {
        setUser(data.user)
      }

      return {}
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'Terjadi kesalahan saat registrasi' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await authApi.logout()
      setUser(null)
      console.log('✅ Logout completed successfully')
    } catch (error) {
      console.error('❌ Sign out error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return { error: 'Tidak ada user yang login' }
    // Update profile would need backend endpoint
    return { error: 'Not implemented' }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await authApi.changePassword(newPassword)
      if (error) {
        return { error }
      }
      return {}
    } catch (error) {
      console.error('Change password error:', error)
      return { error: 'Terjadi kesalahan saat mengubah password' }
    }
  }

  const value = {
    user,
    userProfile: user, // Alias for compatibility
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}