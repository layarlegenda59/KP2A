import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/Auth/LoginForm'
import { MainLayout } from './components/Layout/MainLayout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { MembersPage } from './components/Members/MembersPage'
import { DuesPage } from './components/Dues/DuesPage'
import { LoansPage } from './components/Loans/LoansPage'
import { LoanPaymentsPage } from './components/Loans/LoanPaymentsPage'
import { LoanSchedulePage } from './components/Loans/LoanSchedulePage'
import { ExpensesPage } from './components/Expenses/ExpensesPage'
import { ReportsPage } from './components/Reports/ReportsPage'
import { UploadCSVPage } from './components/Upload/UploadCSVPage'
import { WhatsAppBotPage } from './components/WhatsApp/WhatsAppBotPage'

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
              <MembersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dues"
        element={
          <ProtectedRoute>
            <MainLayout title="Iuran" subtitle="Kelola iuran wajib dan sukarela">
              <DuesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <ProtectedRoute>
            <MainLayout title="Pinjaman" subtitle="Kelola pinjaman dan angsuran">
              <LoansPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loan-payments"
        element={
          <ProtectedRoute>
            <MainLayout title="Pembayaran Angsuran" subtitle="Kelola pembayaran angsuran pinjaman">
              <LoanPaymentsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loan-schedule"
        element={
          <ProtectedRoute>
            <MainLayout title="Jadwal Angsuran" subtitle="Lihat jadwal dan status angsuran">
              <LoanSchedulePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <MainLayout title="Pengeluaran" subtitle="Kelola pengeluaran koperasi">
              <ExpensesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout title="Laporan" subtitle="Laporan keuangan bulanan, triwulan, dan tahunan">
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <MainLayout title="Upload CSV" subtitle="Upload data dari file CSV">
              <UploadCSVPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <MainLayout title="WhatsApp Bot" subtitle="Kelola chatbot WhatsApp">
              <WhatsAppBotPage />
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