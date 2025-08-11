import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable, createMockSupabaseClient, withTimeout } from '../lib/supabase'
import { User } from '../types'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  isDemo: boolean
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
  const [isDemo, setIsDemo] = useState(false)
  
  // Use mock client if Supabase is not available
  const client = supabase || createMockSupabaseClient()

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        if (isSupabaseAvailable()) {
          const { data: { session } } = await withTimeout(client.auth.getSession(), 8000, 'auth.getSession')
          setUser(session?.user ?? null)
          if (session?.user) {
            // Don't await fetchUserProfile to avoid blocking the UI
            fetchUserProfile(session.user.id).catch(err => {
              console.warn('Failed to fetch user profile during init:', err)
            })
          }
        } else {
          // Supabase not available
          setUser(null)
          setIsDemo(false)
        }
      } catch (error) {
        console.warn('Auth initialization failed:', error)
        // If auth fails, still allow the app to load
        setUser(null)
        setIsDemo(false)
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
            // Don't await fetchUserProfile to avoid blocking auth state changes
            fetchUserProfile(session.user.id).catch(err => {
              console.warn('Failed to fetch user profile during auth change:', err)
            })
            setIsDemo(false)
          } else {
            setUserProfile(null)
            setIsDemo(false)
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
      
      const { data, error } = await withTimeout(client
        .from('users')
        .select(`
          *,
          member:members(*)
        `)
        .eq('id', userId)
        .maybeSingle(), 8000, 'fetchUserProfile')

      if (error) {
        console.error('Database error fetching user profile:', error)
        throw error
      }
      
      // If no user profile exists, create a default one
      if (!data) {
        console.log('No user profile found, creating default profile for user:', userId)
        const { data: userData } = await client.auth.getUser()
        if (userData.user) {
          const { data: newProfile, error: insertError } = await client
            .from('users')
            .insert({
              id: userId,
              email: userData.user.email,
              role: 'anggota'
            })
            .select(`
              *,
              member:members(*)
            `)
            .single()
          
          if (insertError) {
            console.error('Error creating user profile:', insertError)
            setUserProfile(null)
            return
          }
          
          setUserProfile(newProfile)
          return
        }
      }
      
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseAvailable()) {
      throw new Error('Koneksi Supabase tidak tersedia. Pastikan konfigurasi sudah benar.')
    }

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    setIsDemo(false)
  }

  const signUp = async (email: string, password: string, role: string) => {
    if (!isSupabaseAvailable()) {
      throw new Error('Koneksi Supabase tidak tersedia. Pastikan konfigurasi sudah benar.')
    }
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    })
    
    if (error) throw error
    
    // Insert user profile into users table
    if (data.user) {
      const { error: profileError } = await client
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          role: role
        })
      
      if (profileError) {
        console.warn('Error creating user profile:', profileError)
      }
    }
  }

  const signOut = async () => {
    if (isSupabaseAvailable()) {
      const { error } = await client.auth.signOut()
      if (error) throw error
    }
    
    // Clear state
    setUser(null)
    setUserProfile(null)
    setIsDemo(false)
  }

  const value = {
    user,
    userProfile,
    loading,
    isDemo,
    signIn,
    signOut,
    signUp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}