import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useRequireAuth } from '../../contexts/AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that requires authentication to render children
 * Redirects to login page if not authenticated
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading, isAuthenticated, error } = useRequireAuth()
  const location = useLocation()

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  // Show error state if provided fallback
  if (error && fallback) {
    return <>{fallback}</>
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('🔒 RequireAuth: User not authenticated, redirecting to login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render children if authenticated
  return <>{children}</>
}

/**
 * Higher-order component version of RequireAuth
 */
export function withRequireAuth<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <RequireAuth fallback={fallback}>
        <Component {...props} />
      </RequireAuth>
    )
  }
}

/**
 * Hook to handle authentication errors gracefully
 */
export function useAuthErrorHandler() {
  const { user, loading, isAuthenticated, error } = useRequireAuth()

  const handleAuthError = (callback?: () => void) => {
    if (error && !loading) {
      console.error('🔒 Auth Error:', error)
      if (callback) {
        callback()
      }
      return true
    }
    return false
  }

  return {
    user,
    loading,
    isAuthenticated,
    error,
    handleAuthError,
    hasAuthError: !!error && !loading
  }
}