import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthPage } from './components/Auth/AuthPage'
import { MainLayout } from './components/Layout/MainLayout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { MembersPage } from './components/Members/MembersPage'
import { DuesPage } from './components/Dues/DuesPage'
import { LoansPage } from './components/Loans/LoansPage'
import { LoanPaymentsPage } from './components/Loans/LoanPaymentsPage'
import { LoanSchedulePage } from './components/Loans/LoanSchedulePage'
import { CashBookPage } from './components/Expenses/CashBookPage'
import { TransactionPage } from './components/Expenses/TransactionPage'
import { CashBankManagementPage } from './components/CashBank/CashBankManagementPage'
import SavingsLoansPage from './components/SavingsLoans/SavingsLoansPage'
import { ReportsPage } from './components/Reports/ReportsPage'
import { UploadCSVPage } from './components/Upload/UploadCSVPage'
import WhatsAppBotPage from './components/WhatsApp/WhatsAppBotPage'
import WhatsAppMobileTest from './components/WhatsApp/WhatsAppMobileTest'
import { AdminManagementPage } from './components/Admin/AdminManagementPage'
import { ProfilePage } from './components/Profile/ProfilePage'
import { ConnectionTest } from './components/Debug/ConnectionTest'
import { IuranSukarelaDebug } from './components/Debug/IuranSukarelaDebug'
import { DuesCalculationTest } from './components/Test/DuesCalculationTest'
import { BroadcastDashboard, ComposeBroadcast, ContactManagement, BroadcastHistory } from './components/Broadcast'



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
        element={user ? <Navigate to="/" /> : <AuthPage />}
      />
      <Route
        path="/debug"
        element={<ConnectionTest />}
      />
      <Route
        path="/debug-iuran"
        element={<IuranSukarelaDebug />}
      />
      <Route
        path="/test-dues"
        element={<DuesCalculationTest />}
      />
      <Route
        path="/whatsapp-test"
        element={
          <MainLayout title="WhatsApp Bot Test" subtitle="Test WhatsApp QR Code Generation">
            <WhatsAppBotPage />
          </MainLayout>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout title="Dashboard" subtitle="SIDARSIH - Sistem Aplikasi Dana Forum Air Bersih">
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MainLayout title="Data Anggota" subtitle="Kelola data anggota">
              <MembersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dues"
        element={
          <ProtectedRoute>
            <MainLayout title="Iuran" subtitle="Kelola iuran wajib dan simpanan sukarela">
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
            <MainLayout title="Angsuran" subtitle="Kelola pembayaran angsuran pinjaman">
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
            <MainLayout title="Buku Kas" subtitle="Kelola transaksi Debit dan Kredit">
              <CashBookPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Routes /expenses/credit and /expenses/debit removed - now handled by tabs in CashBookPage */}
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <MainLayout title="Transaksi" subtitle="Kelola pemasukan dan pengeluaran">
              <TransactionPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cash-bank"
        element={
          <ProtectedRoute>
            <MainLayout title="Manajemen Kas & Bank" subtitle="Kelola saldo dan transfer dana antar akun">
              <CashBankManagementPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/savings-loans"
        element={
          <ProtectedRoute>
            <MainLayout title="Simpanan & Pinjaman" subtitle="Kelola simpanan anggota dan pinjaman">
              <SavingsLoansPage />
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
        path="/whatsapp-bot"
        element={
          <ProtectedRoute>
            <MainLayout title="WhatsApp Bot" subtitle="Kelola chatbot WhatsApp">
              <WhatsAppBotPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp-mobile"
        element={
          <ProtectedRoute>
            <MainLayout title="WhatsApp Mobile Connection" subtitle="Hubungkan dengan WhatsApp mobile Anda">
              <WhatsAppMobileTest />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <MainLayout title="Manajemen Admin" subtitle="Kelola akun pengguna dan hak akses">
              <AdminManagementPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout title="Profil Saya" subtitle="Kelola informasi profil Anda">
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/broadcast"
        element={
          <ProtectedRoute>
            <MainLayout title="WhatsApp Broadcast" subtitle="Dashboard dan manajemen broadcast">
              <BroadcastDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/broadcast/compose"
        element={
          <ProtectedRoute>
            <MainLayout title="Buat Broadcast" subtitle="Buat dan kirim pesan broadcast">
              <ComposeBroadcast />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/broadcast/contacts"
        element={
          <ProtectedRoute>
            <MainLayout title="Kelola Kontak" subtitle="Kelola kontak dan grup untuk broadcast">
              <ContactManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/broadcast/history"
        element={
          <ProtectedRoute>
            <MainLayout title="Riwayat Broadcast" subtitle="Lihat riwayat dan analitik broadcast">
              <BroadcastHistory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                },
              }}
            />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
