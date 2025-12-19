import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')

  if (mode === 'register') {
    return (
      <RegisterForm 
        onBackToLogin={() => setMode('login')} 
      />
    )
  }

  return (
    <LoginForm 
      onShowRegister={() => setMode('register')} 
    />
  )
}