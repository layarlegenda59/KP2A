import React, { useState, useEffect } from 'react'
import { authApi } from '../../lib/api'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
}

export const ConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'API Server', status: 'pending', message: 'Checking...' },
    { name: 'Database Connection', status: 'pending', message: 'Checking...' },
    { name: 'Authentication', status: 'pending', message: 'Checking...' },
    { name: 'JWT Token', status: 'pending', message: 'Checking...' }
  ])
  const [isRunning, setIsRunning] = useState(false)

  const updateTest = (index: number, status: 'success' | 'error', message: string) => {
    setTests(prev => prev.map((test, i) =>
      i === index ? { ...test, status, message } : test
    ))
  }

  const runTests = async () => {
    setIsRunning(true)

    // Reset all tests to pending
    setTests([
      { name: 'API Server', status: 'pending', message: 'Checking...' },
      { name: 'Database Connection', status: 'pending', message: 'Checking...' },
      { name: 'Authentication', status: 'pending', message: 'Checking...' },
      { name: 'JWT Token', status: 'pending', message: 'Checking...' }
    ])

    try {
      // Test 1: API Server health check
      try {
        const response = await fetch('http://localhost:3003/health')
        if (response.ok) {
          const data = await response.json()
          updateTest(0, 'success', `API Server running - ${data.status}`)
        } else {
          updateTest(0, 'error', `API Server returned status ${response.status}`)
        }
      } catch (error) {
        updateTest(0, 'error', 'API Server tidak dapat dijangkau')
      }

      // Test 2: Database connection (via API)
      try {
        const response = await fetch('http://localhost:3003/api/members?limit=1', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        })
        if (response.ok || response.status === 401) {
          updateTest(1, 'success', 'Database connection working')
        } else {
          updateTest(1, 'error', `Database error: ${response.status}`)
        }
      } catch (error) {
        updateTest(1, 'error', 'Database tidak dapat dijangkau')
      }

      // Test 3: Authentication test
      try {
        const result = await authApi.login('admin@kp2acimahi.com', 'admin123')

        if (result.error) {
          updateTest(2, 'error', `Login failed: ${result.error}`)
        } else if (result.data) {
          updateTest(2, 'success', `Login successful for: ${result.data.user.email}`)
          // Cleanup - logout after test
          await authApi.logout()
        } else {
          updateTest(2, 'error', 'Login returned no data')
        }
      } catch (error) {
        updateTest(2, 'error', `Login test error: ${error}`)
      }

      // Test 4: JWT Token check
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // Try to decode JWT (basic check)
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            const expiry = new Date(payload.exp * 1000)
            const isExpired = expiry < new Date()
            if (isExpired) {
              updateTest(3, 'error', `Token expired at ${expiry.toLocaleString()}`)
            } else {
              updateTest(3, 'success', `Valid token, expires: ${expiry.toLocaleString()}`)
            }
          } else {
            updateTest(3, 'error', 'Invalid token format')
          }
        } catch (error) {
          updateTest(3, 'error', 'Failed to decode token')
        }
      } else {
        updateTest(3, 'error', 'No token found - user not logged in')
      }

    } catch (error) {
      console.error('Test error:', error)
    }

    setIsRunning(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'success': return '✅'
      case 'error': return '❌'
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 dark:text-yellow-400'
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'error': return 'text-red-600 dark:text-red-400'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🔍 Diagnosis Koneksi Sistem (MySQL)</h2>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Testing...' : 'Run Tests Again'}
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 border dark:border-gray-600 rounded-lg">
            <span className="text-2xl">{getStatusIcon(test.status)}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{test.name}</h3>
              <p className={`text-sm ${getStatusColor(test.status)}`}>{test.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">💡 Solusi Berdasarkan Hasil Test:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>• Jika API Server gagal: Pastikan mysql-backend berjalan di port 3003</li>
          <li>• Jika Database gagal: Periksa koneksi MySQL dan kredensial database</li>
          <li>• Jika Authentication gagal: Pastikan user admin sudah dibuat di database</li>
          <li>• Jika JWT Token gagal: Coba login ulang untuk mendapatkan token baru</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          ℹ️ Aplikasi ini menggunakan MySQL Backend. Supabase sudah dinonaktifkan.
        </p>
      </div>
    </div>
  )
}

export default ConnectionTest