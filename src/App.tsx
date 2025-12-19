import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/Auth/LoginForm'
import { MainLayout } from './components/Layout/MainLayout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { SQLEditor } from './components/SQLEditor/SQLEditor'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" /> : <LoginForm />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout title="Dashboard" subtitle="Sistem Laporan Keuangan KP2A Cimahi">
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MainLayout title="Data Anggota" subtitle="Kelola data anggota koperasi">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Data Anggota - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dues"
        element={
          <ProtectedRoute>
            <MainLayout title="Iuran" subtitle="Kelola iuran wajib dan sukarela">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Iuran - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <MainLayout title="Pinjaman" subtitle="Kelola pinjaman dan angsuran">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Pinjaman - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <MainLayout title="Pengeluaran" subtitle="Kelola pengeluaran koperasi">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Pengeluaran - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout title="Laporan" subtitle="Laporan keuangan bulanan, triwulan, dan tahunan">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Laporan - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <MainLayout title="Upload CSV" subtitle="Upload data dari file CSV">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman Upload CSV - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <MainLayout title="WhatsApp Bot" subtitle="Kelola chatbot WhatsApp">
              <div className="text-center py-12">
                <p className="text-gray-500">Halaman WhatsApp Bot - Coming Soon</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sql-editor"
        element={
          <ProtectedRoute>
            <MainLayout title="SQL Editor" subtitle="Execute and manage database queries">
              <SQLEditor />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </AuthProvider>
  )
}

export default App