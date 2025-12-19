import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable, createMockSupabaseClient } from '../lib/supabase'
import { User } from '../types'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, role: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use mock client if Supabase is not available
  const client = supabase || createMockSupabaseClient()

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        if (isSupabaseAvailable()) {
          const { data: { session } } = await client.auth.getSession()
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          }
        } else {
          // Demo mode - no user initially
          setUser(null)
        }
      } catch (error) {
        console.warn('Auth initialization failed - using demo mode:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (isSupabaseAvailable()) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          } else {
            setUserProfile(null)
          }
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      if (!isSupabaseAvailable()) throw new Error('Supabase not available')
      
      const { data, error } = await client
        .from('users')
        .select(`
          *,
          member:members(*)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.warn('Error fetching user profile - using demo mode:', error)
      // Create demo user profile
      setUserProfile({
        id: 'demo-user',
        email: 'demo@kp2acimahi.com',
        role: 'admin',
        member: {
          nama_lengkap: 'Demo Admin',
          jabatan: 'Administrator'
        }
      } as any)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      if (isSupabaseAvailable()) {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        throw new Error('Demo mode')
      }
    } catch (error) {
      // Demo mode - accept specific credentials
      if (email === 'admin@kp2acimahi.com' && password === 'admin123') {
        setUser({
          id: 'demo-user',
          email: 'admin@kp2acimahi.com',
        } as any)
        setUserProfile({
          id: 'demo-user',
          email: 'admin@kp2acimahi.com',
          role: 'admin',
          member: {
            nama_lengkap: 'Demo Admin',
            jabatan: 'Administrator'
          }
        } as any)
        return
      }
      throw error
    }
  }

  const signUp = async (email: string, password: string, role: string) => {
    if (!isSupabaseAvailable()) throw new Error('Demo mode - signup not available')
    
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (isSupabaseAvailable()) {
      const { error } = await client.auth.signOut()
      if (error) throw error
    } else {
      // Demo mode - just clear state
      setUser(null)
      setUserProfile(null)
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    signUp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}