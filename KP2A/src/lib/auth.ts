// DEPRECATED: This file is kept for compatibility only.
// The app now uses MySQL backend via AuthContext and api.ts
// authService is stubbed to prevent errors in components that still import it.

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  phone?: string
  address?: string
  role?: 'admin' | 'pengurus' | 'anggota'
}

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone?: string
  address?: string
  role: 'admin' | 'pengurus' | 'anggota'
  member_id?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
  expires_at: number
}

/**
 * DEPRECATED: Supabase Auth Service Stub
 * This class is kept for backward compatibility only.
 * Real authentication is handled by AuthContext using api.ts (MySQL backend).
 */
class SupabaseAuthService {
  private currentSession: AuthSession | null = null

  constructor() {
    // Do nothing - Supabase disabled
    console.log('⚠️ SupabaseAuthService is deprecated. Use AuthContext instead.')
  }

  async login(_credentials: LoginCredentials): Promise<{ user: AuthUser | null; error: string | null }> {
    console.warn('⚠️ authService.login is deprecated. Use AuthContext signIn instead.')
    return { user: null, error: 'Supabase is disabled. Use MySQL backend.' }
  }

  async register(_data: RegisterData): Promise<{ user: AuthUser | null; error: string | null }> {
    console.warn('⚠️ authService.register is deprecated. Use AuthContext signUp instead.')
    return { user: null, error: 'Supabase is disabled. Use MySQL backend.' }
  }

  async logout(): Promise<{ error: string | null }> {
    console.warn('⚠️ authService.logout is deprecated. Use AuthContext signOut instead.')
    this.currentSession = null
    localStorage.removeItem('kp2a_session')
    return { error: null }
  }

  getSession(): AuthSession | null {
    return this.currentSession
  }

  getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || null
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null
  }

  async refreshSession(): Promise<{ user: AuthUser | null; error: string | null }> {
    console.warn('⚠️ authService.refreshSession is deprecated. Use AuthContext instead.')
    return { user: null, error: null }
  }

  async updateProfile(_updates: Partial<AuthUser>): Promise<{ user: AuthUser | null; error: string | null }> {
    console.warn('⚠️ authService.updateProfile is deprecated.')
    return { user: null, error: 'Supabase is disabled' }
  }

  async changePassword(_newPassword: string): Promise<{ error: string | null }> {
    console.warn('⚠️ authService.changePassword is deprecated.')
    return { error: 'Supabase is disabled' }
  }

  onAuthStateChange(_callback: (user: AuthUser | null) => void) {
    console.warn('⚠️ authService.onAuthStateChange is deprecated.')
    return { data: { subscription: { unsubscribe: () => { } } } }
  }
}

// Export singleton instance
export const authService = new SupabaseAuthService()
export default authService