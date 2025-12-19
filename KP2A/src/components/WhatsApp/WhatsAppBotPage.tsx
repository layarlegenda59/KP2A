import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import QRCode from 'qrcode'
import { authService } from '../../lib/auth'

// Safe toast wrapper to prevent errors
const safeToast = {
  success: (message: string) => {
    try {
      if (toast && typeof toast.success === 'function') {
        toast.success(message)
      } else {
        console.log('✅ SUCCESS:', message)
      }
    } catch (error) {
      console.error('Toast success error:', error)
      console.log('✅ SUCCESS:', message)
    }
  },
  error: (message: string) => {
    try {
      if (toast && typeof toast.error === 'function') {
        toast.error(message)
      } else {
        console.log('❌ ERROR:', message)
      }
    } catch (error) {
      console.error('Toast error error:', error)
      console.log('❌ ERROR:', message)
    }
  },
  info: (message: string) => {
    try {
      if (toast && typeof toast.info === 'function') {
        toast.info(message)
      } else {
        console.log('ℹ️ INFO:', message)
      }
    } catch (error) {
      console.error('Toast info error:', error)
      console.log('ℹ️ INFO:', message)
    }
  },
  warning: (message: string) => {
    try {
      if (toast && typeof toast.warning === 'function') {
        toast.warning(message)
      } else {
        console.log('⚠️ WARNING:', message)
      }
    } catch (error) {
      console.error('Toast warning error:', error)
      console.log('⚠️ WARNING:', message)
    }
  }
}
import {
  FaComment,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaSync,
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaTrash,
  FaQrcode,
  FaUsers,
  FaChartBar,
  FaShieldAlt,
  FaCog,
  FaWhatsapp,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaDownload,
  FaMoneyBillWave,
  FaWallet,
  FaExclamationTriangle,
  FaBell
} from 'react-icons/fa'
import { isDatabaseAvailable, databaseClient } from '../../lib/database'
import whatsappSocketService, { WhatsAppStatus, WhatsAppMessage } from '../../services/whatsapp-socket.service';
import { browserWhatsAppService } from '../../lib/whatsapp-browser-service';
import { getTransactionHistory, getTransactionAnalytics, TransactionResult } from '../../utils/financialTransactions';
import MemberVerification from './MemberVerification'


// Types
interface BotStatus {
  status: 'active' | 'inactive'
  phoneNumber: string
  welcomeMessage: string
  autoReply: boolean
  sessionId?: string
  qrCode?: string
  isConnected: boolean
  lastActivity?: string
}

interface MessageTemplate {
  id: string
  name: string
  content: string
  variables?: string[]
  category: 'welcome' | 'menu' | 'balance' | 'loan' | 'error' | 'help'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SupabaseTemplate {
  id: string
  name: string
  content: string
  variables: string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SupabaseConfig {
  id: string
  status: string
  phone_number: string
  welcome_message: string
  auto_reply: boolean
  created_at: string
  updated_at: string
}

interface BotConfig {
  status: 'active' | 'inactive'
  phoneNumber: string
  welcomeMessage: string
  autoReply: boolean
  sessionId?: string
  qrCode?: string
  isConnected: boolean
  lastActivity?: string
}

interface WhatsAppSession {
  id: string
  session_id: string
  phone_number: string
  qr_code?: string
  status: 'pending' | 'connected' | 'disconnected'
  expires_at: string
  created_at: string
  updated_at: string
}

interface MemberVerification {
  id: string
  whatsapp_number: string
  member_id: string
  member_name: string
  verification_status: 'pending' | 'verified' | 'rejected'
  verification_code?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

interface AnalyticsData {
  totalMessages: number
  activeUsers: number
  verifiedMembers: number
  messagesByDay: { date: string; count: number }[]
  popularCommands: { command: string; count: number }[]
}

const WhatsAppBotPage: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'verification' | 'analytics' | 'security'>('dashboard')
  const [databaseAvailable, setDatabaseAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  // Bot configuration state
  const [botConfig, setBotConfig] = useState<BotConfig>({
    status: 'inactive',
    phoneNumber: '',
    welcomeMessage: 'Selamat datang di SIDARSIH! Ketik "menu" untuk melihat layanan kami.',
    autoReply: true,
    isConnected: false
  })
  
  // Template management state
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<MessageTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [templateCategory, setTemplateCategory] = useState<'welcome' | 'menu' | 'balance' | 'loan' | 'error' | 'help'>('welcome')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  
  // QR Code state
  const [qrCodeImage, setQrCodeImage] = useState<string>('')
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'connected' | 'disconnected'>('disconnected')
  const [sessionExpiry, setSessionExpiry] = useState<string>('')
  
  // Member verification state
  const [verifications, setVerifications] = useState<MemberVerification[]>([])
  const [showVerificationDetails, setShowVerificationDetails] = useState<string | null>(null)
  
  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMessages: 0,
    activeUsers: 0,
    verifiedMembers: 0,
    messagesByDay: [],
    popularCommands: []
  })
  
  // Test bot state
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  
  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    rateLimitEnabled: true,
    maxMessagesPerMinute: 10,
    sessionTimeoutMinutes: 30,
    encryptionEnabled: true,
    auditLogEnabled: true,
    allowedNumbers: [] as string[]
  })

  // Financial transaction state
  const [transactionHistory, setTransactionHistory] = useState<any[]>([])
  const [transactionAnalytics, setTransactionAnalytics] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageAmount: 0,
    topPaymentTypes: []
  })
  const [processingPayment, setProcessingPayment] = useState(false)
  const [lastTransactionResult, setLastTransactionResult] = useState<TransactionResult | null>(null)

  const qrCodeRef = useRef<HTMLCanvasElement>(null)

  // This useEffect will be moved after generateQRCode function is defined

  // Setup event listeners immediately on mount (before any async operations)
  useEffect(() => {
    console.log('🔧 Setting up WhatsApp event listeners immediately on mount...')
    setupWhatsAppListeners()
    console.log('✅ Event listeners setup complete')
  }, [])

  // Initialize component
  useEffect(() => {
    console.log('🚀 WhatsAppBotPage component mounted!')
    
    // Set timeout for loading state to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 10000) // 10 seconds timeout
    
    const initializeComponent = async () => {
      try {
        setLoading(true)
        const dbAvailable = await isDatabaseAvailable()
        setDatabaseAvailable(dbAvailable)
        
        // Setup event listeners FIRST before connecting
        setupWhatsAppListeners()
        
        // Then initialize WhatsApp API service
        whatsappSocketService.reconnect()
        
        // Check current WhatsApp connection status first
        await checkWhatsAppConnectionStatus()
        
        if (dbAvailable) {
          // Load data with individual error handling
          const loadPromises = [
            loadBotConfig().catch(error => console.error('Failed to load bot config:', error)),
            loadTemplates().catch(error => console.error('Failed to load templates:', error)),
            loadVerifications().catch(error => console.error('Failed to load verifications:', error)),
            loadAnalytics().catch(error => console.error('Failed to load analytics:', error)),
            loadTransactionHistory().catch(error => console.error('Failed to load transaction history:', error)),
            loadTransactionAnalytics().catch(error => console.error('Failed to load transaction analytics:', error))
          ]
          
          await Promise.allSettled(loadPromises)
        } else {
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('❌ WhatsAppBotPage: Initialization error:', error)
        safeToast.error('Gagal menginisialisasi komponen WhatsApp Bot')
      } finally {
        clearTimeout(loadingTimeout)
        setLoading(false)
      }
    }
    
    initializeComponent()
    
    // Cleanup on unmount
    return () => {
      clearTimeout(loadingTimeout)
      whatsappSocketService.disconnect()
    }
  }, [])

  // Check WhatsApp connection status on component load
  const checkWhatsAppConnectionStatus = async () => {
    try {
      const status = await whatsappSocketService.getStatus()
      console.log('Initial WhatsApp status:', status)
      
      // Check if this is demo mode (backend not connected)
      const isSocketConnected = whatsappSocketService.isSocketConnected()
      const isDemoMode = !isSocketConnected
      
      if (isDemoMode) {
        console.log('🎭 Demo mode detected - backend not connected')
        setIsDemoMode(true)
        setSessionStatus('disconnected')
        setBotConfig(prev => ({ ...prev, isConnected: false }))
        safeToast.warning('Mode Demo: Backend WhatsApp tidak terhubung')
        return
      }
      
      setIsDemoMode(false)
      
      if (status.isConnected && status.phone_number) {
        setSessionStatus('connected')
        setBotConfig(prev => ({ 
          ...prev, 
          isConnected: true,
          phoneNumber: status.phone_number || prev.phoneNumber
        }))
        setQrCodeImage('') // Clear any existing QR code
        safeToast.success('WhatsApp sudah terhubung!')
      } else {
        setSessionStatus('disconnected')
        setBotConfig(prev => ({ ...prev, isConnected: false }))
        console.log('WhatsApp not connected - status:', status)
      }
    } catch (error) {
      console.error('Error checking initial WhatsApp status:', error)
      setSessionStatus('disconnected')
      setBotConfig(prev => ({ ...prev, isConnected: false }))
    }
  }

  // Load bot configuration
  const loadBotConfig = async () => {
    try {
      const { data: configs, error } = await databaseClient
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading bot config:', error)
        
        // Handle specific database schema errors
        if (error.message && error.message.includes('is_connected')) {
          console.warn('Column is_connected not found, using default value')
          safeToast.warning('Database schema sedang diperbarui, menggunakan nilai default untuk status koneksi')
        }
        return
      }
      
      if (configs) {
        setBotConfig({
          status: configs.status as 'active' | 'inactive',
          phoneNumber: configs.phone_number || '',
          welcomeMessage: configs.welcome_message || 'Selamat datang di KP2A Cimahi!',
          autoReply: configs.auto_reply || true,
          sessionId: undefined, // Not stored in whatsapp_config table
          qrCode: undefined, // Not stored in whatsapp_config table
          // Force disconnected status initially - real status will be checked by checkWhatsAppConnectionStatus
          isConnected: false,
          lastActivity: undefined // Not stored in whatsapp_config table
        })
        
        console.log('Bot config loaded from database, connection status will be verified separately')
      }
    } catch (error) {
      console.error('Error loading bot config:', error)
      
      // Handle specific database errors gracefully
      if (error instanceof Error) {
        if (error.message.includes('is_connected')) {
          safeToast.warning('Database schema sedang diperbarui, menggunakan konfigurasi default')
          // Set default configuration
          setBotConfig({
            status: 'inactive',
            phoneNumber: '',
            welcomeMessage: 'Selamat datang di KP2A Cimahi!',
            autoReply: true,
            isConnected: false
          })
        } else {
          safeToast.error('Gagal memuat konfigurasi bot')
        }
      }
    }
  }

  // Load message templates
  const loadTemplates = async () => {
    try {
      const templatesData = await browserWhatsAppService.getTemplates()
      
      if (templatesData && templatesData.length > 0) {
        const formattedTemplates: MessageTemplate[] = templatesData.map((template: any) => ({
          id: template.id,
          name: template.name || 'Unnamed Template',
          content: template.content || '',
          variables: template.variables ? (typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables) : [],
          category: template.category as 'welcome' | 'menu' | 'balance' | 'loan' | 'error' | 'help' || 'help',
          is_active: template.is_active || false,
          created_at: template.created_at || new Date().toISOString(),
          updated_at: template.updated_at || new Date().toISOString()
        }))
        setTemplates(formattedTemplates)
      } else {
        // Set default templates if none exist
        setTemplates([])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    }
  }

  // Load member verifications
  const loadVerifications = async () => {
    try {
      const verificationsData = await browserWhatsAppService.getVerifications()
      setVerifications(verificationsData)
    } catch (error) {
      console.error('Error loading verifications:', error)
      setVerifications([])
    }
  }

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      const analyticsData = await browserWhatsAppService.getAnalytics()
      
      // Process the data
      const totalMessages = analyticsData.summary?.totalMessages || 0
      const verifiedMembers = analyticsData.summary?.verifiedUsers || 0
      
      // Get active users (users who sent messages in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentMessages = analyticsData.messageStats?.filter((msg: any) => 
        new Date(msg.created_at) >= sevenDaysAgo
      ) || []
      
      const uniqueActiveUsers = new Set(recentMessages.map((msg: any) => msg.phone_number)).size
      
      const messagesByDay = processMessagesByDay(recentMessages)
      
      setAnalytics({
        totalMessages,
        activeUsers: uniqueActiveUsers,
        verifiedMembers,
        messagesByDay,
        popularCommands: [
          { command: 'menu', count: 45 },
          { command: 'saldo', count: 32 },
          { command: 'pinjaman', count: 28 },
          { command: 'bantuan', count: 15 }
        ]
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  // Process messages by day for chart
  const processMessagesByDay = (messages: any[]) => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      last7Days.push({
        date: date.toISOString().split('T')[0],
        count: 0
      })
    }
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toISOString().split('T')[0]
      const dayData = last7Days.find(day => day.date === messageDate)
      if (dayData) {
        dayData.count++
      }
    })
    
    return last7Days
  }

  // Load transaction history
  const loadTransactionHistory = async () => {
    try {
      const history = await getTransactionHistory()
      setTransactionHistory(history)
    } catch (error) {
      console.error('Error loading transaction history:', error)
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('auth')) {
        console.log('Authentication error detected, attempting to refresh session...')
        // Try to refresh session and retry
        try {
          const { user } = await authService.refreshSession()
          if (user) {
            // Retry the operation
            const history = await getTransactionHistory()
            setTransactionHistory(history)
            return
          }
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError)
        }
      }
      
      // Set empty array as fallback
      setTransactionHistory([])
      safeToast.error('Gagal memuat riwayat transaksi')
    }
  }

  // Load transaction analytics
  const loadTransactionAnalytics = async () => {
    try {
      const analytics = await getTransactionAnalytics()
      setTransactionAnalytics(analytics)
    } catch (error) {
      console.error('Error loading transaction analytics:', error)
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('auth')) {
        console.log('Authentication error detected, attempting to refresh session...')
        // Try to refresh session and retry
        try {
          const { user } = await authService.refreshSession()
          if (user) {
            // Retry the operation
            const analytics = await getTransactionAnalytics()
            setTransactionAnalytics(analytics)
            return
          }
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError)
        }
      }
      
      // Set default analytics as fallback
      setTransactionAnalytics({
        totalTransactions: 0,
        totalAmount: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        averageAmount: 0,
        dailySummary: []
      })
      safeToast.error('Gagal memuat analitik transaksi')
    }
  }

  // Load from localStorage (fallback)
  const loadFromLocalStorage = () => {
    const savedConfig = localStorage.getItem('whatsapp_bot_config')
    const savedTemplates = localStorage.getItem('whatsapp_templates')
    
    if (savedConfig) {
      setBotConfig(JSON.parse(savedConfig))
    }
    
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates))
    }
  }

  // Setup WhatsApp Socket.IO service listeners
  const setupWhatsAppListeners = () => {
    console.log('🔧 Setting up WhatsApp listeners...')
    


    // Listen for QR code updates
    console.log('🔧 Setting up QR code listener...')
    whatsappSocketService.onQRCode((qrCode: string) => {
      console.log('🔥 ========== QR CODE CALLBACK TRIGGERED ==========')
      console.log('🔥 QR Code received via Socket.IO:', qrCode)
      console.log('🔥 QR Code length:', qrCode?.length)
      console.log('🔥 QR Code type:', typeof qrCode)
      console.log('🔥 QR Code starts with:', qrCode?.substring(0, 30))
      console.log('🔥 Current qrCodeImage state before update:', qrCodeImage)
      console.log('🔥 Setting QR code image state...')
      
      setQrCodeImage(qrCode)
      setSessionStatus('pending')
      setBotConfig(prev => ({
        ...prev,
        sessionId: 'default',
        qrCode: qrCode
      }))
      
      console.log('🔥 QR Code state updated successfully')
      console.log('🔥 New qrCodeImage state should be:', qrCode?.substring(0, 30) + '...')
      console.log('🔥 ========== QR CODE CALLBACK COMPLETED ==========')
      
      safeToast.success('QR Code berhasil diterima!')
      safeToast.info('QR Code baru tersedia! Silakan scan dengan WhatsApp.')
    })
    console.log('✅ QR code listener setup complete')

    // Listen for status updates
    whatsappSocketService.onStatusChange((status: any) => {
      console.log('Status update via Socket.IO:', status)
      
      // Handle different status formats
      if (status.status === 'connected' || status.connected === true) {
        setSessionStatus('connected')
        setBotConfig(prev => ({ 
          ...prev, 
          isConnected: true,
          phoneNumber: status.phone_number || status.phoneNumber || prev.phoneNumber
        }))
        setQrCodeImage('') // Clear QR code when connected
        safeToast.success('WhatsApp berhasil terhubung!')
      } else if (status.status === 'disconnected' || status.connected === false) {
        setSessionStatus('disconnected')
        setBotConfig(prev => ({ ...prev, isConnected: false }))
        safeToast.error('WhatsApp terputus')
      } else if (status.status === 'error') {
        setSessionStatus('disconnected')
        setBotConfig(prev => ({ ...prev, isConnected: false }))
        safeToast.error(`Error: ${status.message || 'Terjadi error pada koneksi WhatsApp'}`)
      } else if (status.status === 'initializing') {
        setSessionStatus('pending')
        safeToast.info('Menginisialisasi WhatsApp...')
      } else if (status.status === 'reconnecting') {
        setSessionStatus('pending')
        safeToast.info(`Mencoba menghubungkan kembali... (${status.reconnectAttempts || 0})`)
      } else if (status.status === 'qr') {
        setSessionStatus('pending')
        if (status.qrReady) {
          safeToast.success('QR Code siap untuk di-scan!')
        }
      }
    })

    // Listen for incoming messages
    whatsappSocketService.onMessage((message: WhatsAppMessage) => {
      console.log('Message received via Socket.IO:', message)
      const fromNumber = message.from_number || message.from
      safeToast.info(`Pesan baru dari ${fromNumber}`)
      // Refresh analytics or message list if needed
      loadAnalytics()
    })

    // Listen for Socket.IO connection status
    whatsappSocketService.onConnection((connected: boolean) => {
      console.log('Socket.IO connection status:', connected)
      if (!connected) {
        safeToast.error('Koneksi ke backend terputus')
      } else {
        safeToast.success('Terhubung ke backend')
      }
    })
  }

  // Generate QR Code for WhatsApp connection using Socket.IO
  const generateQRCode = async () => {
    console.log('🚀🚀🚀🚀🚀 GENERATE QR CODE FUNCTION CALLED 🚀🚀🚀🚀🚀');
    console.log('🚀 Function called at:', new Date().toISOString());
    console.log('🚀 This is the generateQRCode function!');
    try {
      console.log('🔄 Generate QR Code button clicked')
      setLoading(true)
      
      // Check if Socket.IO is connected
      if (!whatsappSocketService.isSocketConnected()) {
        console.error('❌ Socket.IO not connected')
        safeToast.error('Tidak terhubung ke backend. Silakan tunggu sebentar...')
        setLoading(false)
        return
      }
      console.log('✅ Socket.IO is connected')
      
      // First check current connection status
      try {
        console.log('🔍 Checking current WhatsApp status...')
        const status = await whatsappSocketService.getStatus()
        console.log('📊 Current status:', status)
        
        if (status.isConnected) {
          console.log('⚠️ WhatsApp already connected, disconnecting first...')
          safeToast.info('WhatsApp sudah terhubung. Memutus koneksi untuk generate QR code baru...')
          
          // Disconnect first
          try {
            await whatsappSocketService.disconnect()
            console.log('✅ Successfully disconnected WhatsApp')
            safeToast.success('WhatsApp berhasil diputus. Generating QR code baru...')
            
            // Reset states
            setSessionStatus('disconnected')
            setQrCodeImage('')
            setBotConfig(prev => ({ 
              ...prev, 
              isConnected: false,
              phoneNumber: '',
              qrCode: undefined
            }))
            
            // Wait a moment for disconnection to complete
            await new Promise(resolve => setTimeout(resolve, 2000))
            
          } catch (disconnectError) {
            console.error('❌ Error disconnecting WhatsApp:', disconnectError)
            safeToast.error('Gagal memutus koneksi WhatsApp')
            setLoading(false)
            return
          }
        }
      } catch (statusError) {
        console.warn('⚠️ Could not check status, proceeding with initialization:', statusError)
      }
      
      // Generate QR Code via Socket.IO
      try {
        console.log('🚀 Generating QR Code via Socket.IO...')
        const qrResult = await whatsappSocketService.generateQRCode('default')
        console.log('✅ QR Code generation started successfully via Socket.IO')
        console.log('🔍 QR result:', qrResult)
        
        // Update UI state
        setSessionStatus('pending')
        setBotConfig(prev => ({
          ...prev,
          sessionId: 'default'
        }))
        
        safeToast.success('QR Code generation started! QR Code akan muncul sebentar lagi.')
        
      } catch (qrError) {
        console.error('❌ Error generating QR Code via Socket.IO:', qrError)
        throw new Error('Gagal generate QR Code. Silakan coba lagi.')
      }
      
    } catch (error) {
      console.error('❌ Error generating QR code:', error)
      
      // Reset states on error
      setQrCodeImage('')
      setSessionStatus('disconnected')
      
      // Safe error message extraction
      let errorMessage = 'Terjadi kesalahan yang tidak diketahui'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Handle specific error cases
      if (errorMessage.includes('sudah terhubung')) {
        safeToast.info(errorMessage)
      } else if (errorMessage.includes('Socket not connected')) {
        safeToast.error('Koneksi ke backend terputus. Silakan refresh halaman.')
      } else {
        safeToast.error('Gagal membuat QR Code: ' + errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  // Add test function to window for debugging (moved here after generateQRCode is defined)
  useEffect(() => {
    (window as any).testGenerateQR = generateQRCode;
    console.log('🔧 Test function added to window: window.testGenerateQR()');
  }, []); // Empty dependency array since we only want this to run once

  // Disconnect WhatsApp
  const disconnectWhatsApp = async () => {
    try {
      setLoading(true)
      await whatsappSocketService.disconnect()
      
      setSessionStatus('disconnected')
      setQrCodeImage('')
      setBotConfig(prev => ({ 
        ...prev, 
        isConnected: false,
        phoneNumber: '',
        qrCode: undefined
      }))
      
      safeToast.success('WhatsApp berhasil diputus. Anda dapat scan QR code baru.')
      
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error)
      safeToast.error('Gagal memutus koneksi WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  // Test WhatsApp Connection
  const testWhatsAppConnection = async () => {
    try {
      setLoading(true)
      const status = await whatsappSocketService.getStatus()
      
      if (status.isConnected) {
        safeToast.success(`WhatsApp terhubung! Nomor: ${status.phone_number || 'Tidak diketahui'}`)
        setBotConfig(prev => ({
          ...prev,
          isConnected: true,
          phoneNumber: status.phone_number || '',
          lastActivity: new Date().toISOString()
        }))
        setSessionStatus('connected')
      } else {
        safeToast.info('WhatsApp belum terhubung. Silakan scan QR code.')
        setSessionStatus('disconnected')
      }
      
    } catch (error) {
      console.error('Error testing WhatsApp connection:', error)
      safeToast.error('Gagal mengecek status koneksi WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  // Handle bot configuration save
  const handleSaveConfig = async () => {
    try {
      if (databaseAvailable) {
        const configData = {
          status: botConfig.status,
          phone_number: botConfig.phoneNumber,
          welcome_message: botConfig.welcomeMessage,
          auto_reply: botConfig.autoReply,
          updated_at: new Date().toISOString()
        }
        
        const { data: existingConfig, error: selectError } = await databaseClient
          .from('whatsapp_config')
          .select('id')
          .limit(1)
          .single()
        
        // Handle select errors gracefully
        if (selectError && selectError.code !== 'PGRST116') {
          console.error('Error checking existing config:', selectError)
          safeToast.warning('Database schema belum lengkap, menyimpan ke localStorage')
          localStorage.setItem('whatsapp_bot_config', JSON.stringify(botConfig))
          safeToast.success('Konfigurasi bot berhasil disimpan!')
          return
        }
        
        if (existingConfig) {
          // Support both Supabase client and SQLite adapter
          const updateBuilder: any = databaseClient
            .from('whatsapp_config')
            .update(configData)
            .eq('id', existingConfig.id)
          
          const updateResult = updateBuilder?.execute 
            ? await updateBuilder.execute() 
            : await updateBuilder
          const updateError = updateResult?.error
          
          if (updateError) {
            console.error('Error updating whatsapp_config:', updateError)
            
            // Handle specific column errors
            if (updateError.message && (updateError.message.includes('qr_code') || updateError.message.includes('is_connected') || updateError.message.includes('session_id') || updateError.message.includes('last_activity'))) {
              safeToast.warning('Database schema belum lengkap, menyimpan ke localStorage')
              localStorage.setItem('whatsapp_bot_config', JSON.stringify(botConfig))
              safeToast.success('Konfigurasi bot berhasil disimpan!')
              return
            }
            
            safeToast.error('Gagal menyimpan konfigurasi (update)')
            return
          }
        } else {
          const insertBuilder: any = databaseClient
            .from('whatsapp_config')
            .insert(configData)
          
          const insertResult = insertBuilder?.execute 
            ? await insertBuilder.execute() 
            : await insertBuilder
          const insertError = insertResult?.error
          
          if (insertError) {
            console.error('Error inserting whatsapp_config:', insertError)
            
            // Handle specific column errors
            if (insertError.message && (insertError.message.includes('qr_code') || insertError.message.includes('is_connected') || insertError.message.includes('session_id') || insertError.message.includes('last_activity'))) {
              safeToast.warning('Database schema belum lengkap, menyimpan ke localStorage')
              localStorage.setItem('whatsapp_bot_config', JSON.stringify(botConfig))
              safeToast.success('Konfigurasi bot berhasil disimpan!')
              return
            }
            
            safeToast.error('Gagal menyimpan konfigurasi (insert)')
            return
          }
        }
        
        safeToast.success('Konfigurasi bot berhasil disimpan!')
      } else {
        localStorage.setItem('whatsapp_bot_config', JSON.stringify(botConfig))
        safeToast.success('Konfigurasi bot berhasil disimpan!')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      
      // Handle specific errors gracefully
      if (error instanceof Error && (error.message.includes('qr_code') || error.message.includes('is_connected') || error.message.includes('session_id') || error.message.includes('last_activity'))) {
        safeToast.warning('Database schema belum lengkap, menyimpan ke localStorage')
        localStorage.setItem('whatsapp_bot_config', JSON.stringify(botConfig))
        safeToast.success('Konfigurasi bot berhasil disimpan!')
      } else {
        safeToast.error('Gagal menyimpan konfigurasi')
      }
    }
  }

  // Template management functions
  const handleAddTemplate = () => {
    setCurrentTemplate(null)
    setTemplateName('')
    setTemplateContent('')
    setTemplateCategory('welcome')
    setShowTemplateForm(true)
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setCurrentTemplate(template)
    setTemplateName(template.name)
    setTemplateContent(template.content)
    setTemplateCategory(template.category)
    setShowTemplateForm(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      safeToast.error('Nama dan konten template harus diisi')
      return
    }
    
    try {
      const templateData = {
        name: templateName,
        content: templateContent,
        category: templateCategory,
        variables: JSON.stringify([]),
        is_active: true,
        updated_at: new Date().toISOString()
      }
      
      if (databaseAvailable) {
        if (currentTemplate) {
          await databaseClient
            .from('message_templates')
            .update(templateData)
            .eq('id', currentTemplate.id)
        } else {
          await databaseClient
            .from('message_templates')
            .insert({
              ...templateData,
              created_at: new Date().toISOString()
            })
        }
        
        await loadTemplates()
        safeToast.success(`Template ${currentTemplate ? 'diperbarui' : 'ditambahkan'}!`)
      } else {
        // Handle localStorage fallback
        const newTemplate: MessageTemplate = {
          id: currentTemplate?.id || Date.now().toString(),
          name: templateName,
          content: templateContent,
          category: templateCategory,
          variables: [],
          is_active: true,
          created_at: currentTemplate?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        if (currentTemplate) {
          setTemplates(prev => prev.map(t => t.id === currentTemplate.id ? newTemplate : t))
        } else {
          setTemplates(prev => [newTemplate, ...prev])
        }
        
        localStorage.setItem('whatsapp_templates', JSON.stringify(templates))
        safeToast.success(`Template ${currentTemplate ? 'diperbarui' : 'ditambahkan'}!`)
      }
      
      setShowTemplateForm(false)
    } catch (error) {
      console.error('Error saving template:', error)
      safeToast.error('Gagal menyimpan template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      if (databaseAvailable) {
        await databaseClient
          .from('message_templates')
          .delete()
          .eq('id', templateId)
        
        await loadTemplates()
        safeToast.success('Template berhasil dihapus!')
      } else {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
        localStorage.setItem('whatsapp_templates', JSON.stringify(templates.filter(t => t.id !== templateId)))
        safeToast.success('Template berhasil dihapus!')
      }
      
      setConfirmDeleteId(null)
    } catch (error) {
      console.error('Error deleting template:', error)
      safeToast.error('Gagal menghapus template')
    }
  }

  // Test bot functionality
  const handleTestBot = async () => {
    if (!testMessage.trim()) {
      safeToast.error('Pesan tidak boleh kosong')
      return
    }
    
    setTestLoading(true)
    
    try {
      // Try to send test message via WhatsApp API
      const testPhoneNumber = '6281234567890' // Test number
      await whatsappSocketService.sendMessage(testPhoneNumber, testMessage, 'default')
      
      // Simulate bot response logic
      let response = ''
      const lowerMessage = testMessage.toLowerCase()
      if (lowerMessage.includes('menu')) {
        response = 'Menu KP2A Cimahi:\n1️⃣ Cek Saldo Simpanan\n2️⃣ Info Pinjaman\n3️⃣ Riwayat Transaksi\n4️⃣ Bantuan'
      } else if (lowerMessage.includes('saldo') || lowerMessage === '1') {
        response = 'Informasi Saldo Simpanan Anda:\n💰 Saldo Simpanan Pokok: Rp 500.000\n💰 Saldo Simpanan Wajib: Rp 1.200.000\n💰 Saldo Simpanan Sukarela: Rp 800.000\n\nTotal Simpanan: Rp 2.500.000'
      } else if (lowerMessage.includes('pinjaman') || lowerMessage === '2') {
        response = 'Informasi Pinjaman Anda:\n📋 Status Pinjaman: Aktif\n💵 Jumlah Pinjaman: Rp 5.000.000\n💰 Sisa Pinjaman: Rp 3.500.000\n📅 Jatuh Tempo: 15 Januari 2025\n💳 Angsuran Bulanan: Rp 250.000'
      } else if (lowerMessage.includes('bantuan') || lowerMessage === '4') {
        response = 'Bantuan KP2A Cimahi Bot:\n🤖 Cara menggunakan bot:\n• Ketik angka 1-4 untuk memilih menu\n• Ketik "menu" untuk melihat pilihan menu\n\n📞 Kontak KP2A Cimahi:\n• Telepon: (022) 6652345\n• WhatsApp Admin: 0812-3456-7890'
      } else {
        response = 'Selamat datang di KP2A Cimahi! 👋\n\nSilakan pilih menu berikut:\n1️⃣ Cek Saldo Simpanan\n2️⃣ Info Pinjaman\n3️⃣ Riwayat Transaksi\n4️⃣ Bantuan\n\nKetik angka pilihan Anda atau ketik "menu" untuk melihat pilihan ini lagi.'
      }
      
      setTestResponse(response)
      safeToast.success('Pesan test berhasil dikirim!')
    } catch (error) {
      console.error('Error testing bot:', error)
      // Fallback to simulation if WhatsApp not connected
      let response = 'Selamat datang di KP2A Cimahi! 👋\n\nSilakan pilih menu berikut:\n1️⃣ Cek Saldo Simpanan\n2️⃣ Info Pinjaman\n3️⃣ Riwayat Transaksi\n4️⃣ Bantuan\n\nKetik angka pilihan Anda atau ketik "menu" untuk melihat pilihan ini lagi.'
      setTestResponse(response)
      safeToast.info('Test mode: WhatsApp belum terhubung')
    } finally {
      setTestLoading(false)
    }
  }

  // Handle member verification approval
  const handleVerificationAction = async (verificationId: string, action: 'approve' | 'reject') => {
    try {
      if (databaseAvailable) {
        await databaseClient
          .from('whatsapp_verifications')
          .update({
            verification_status: action === 'approve' ? 'verified' : 'rejected',
            verified_at: action === 'approve' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', verificationId)
        
        await loadVerifications()
        safeToast.success(`Verifikasi ${action === 'approve' ? 'disetujui' : 'ditolak'}!`)
      }
    } catch (error) {
      console.error('Error updating verification:', error)
      safeToast.error('Gagal memperbarui verifikasi')
    }
  }

  // Refresh data
  const handleRefreshData = async () => {
    setLoading(true)
    if (databaseAvailable) {
      await Promise.all([
        loadBotConfig(),
        loadTemplates(),
        loadVerifications(),
        loadAnalytics()
      ])
    }
    setLoading(false)
    safeToast.success('Data berhasil diperbarui!')
  }

  // Download QR Code
  const downloadQRCode = () => {
    if (qrCodeImage) {
      const link = document.createElement('a')
      link.download = 'whatsapp-qr-code.png'
      link.href = qrCodeImage
      link.click()
    }
  }



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaWhatsapp className="mr-3 h-8 w-8 text-green-500" />
              WhatsApp Bot Management
            </h1>
            <p className="text-gray-600 mt-1">Kelola bot WhatsApp KP2A Cimahi untuk layanan anggota</p>
          </div>
          <button
            onClick={handleRefreshData}
            className="btn btn-secondary flex items-center"
          >
            <FaSync className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: FaCog },
            { id: 'templates', label: 'Template Pesan', icon: FaComment },
            { id: 'verification', label: 'Verifikasi Anggota', icon: FaUsers },
            { id: 'analytics', label: 'Analytics', icon: FaChartBar },
            { id: 'security', label: 'Keamanan', icon: FaShieldAlt }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Bot Configuration */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaCog className="mr-2 h-5 w-5" />
                  Konfigurasi Bot
                </h2>
                
                <div className="space-y-4">
                  {/* Bot Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Status Bot</h3>
                      <p className="text-xs text-gray-500">Aktifkan atau nonaktifkan bot</p>
                    </div>
                    <button 
                      onClick={() => setBotConfig(prev => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))}
                      className={`flex items-center ${botConfig.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {botConfig.status === 'active' ? (
                        <>
                          <FaToggleOn className="h-6 w-6 mr-1" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <FaToggleOff className="h-6 w-6 mr-1" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="text"
                      value={botConfig.phoneNumber}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+628xxxxxxxxxx"
                    />
                  </div>
                  
                  {/* Welcome Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pesan Sambutan
                    </label>
                    <textarea
                      value={botConfig.welcomeMessage}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Pesan sambutan untuk pengguna baru"
                    />
                  </div>
                  
                  {/* Auto Reply */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Auto Reply</h3>
                      <p className="text-xs text-gray-500">Balas pesan secara otomatis</p>
                    </div>
                    <button 
                      onClick={() => setBotConfig(prev => ({ ...prev, autoReply: !prev.autoReply }))}
                      className={`flex items-center ${botConfig.autoReply ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {botConfig.autoReply ? (
                        <>
                          <FaToggleOn className="h-6 w-6 mr-1" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <FaToggleOff className="h-6 w-6 mr-1" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSaveConfig}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                  >
                    <FaSave className="h-4 w-4 mr-2" />
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>

              {/* QR Code Section */}
               <div className="bg-white rounded-lg shadow p-6 mt-6">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                   <FaQrcode className="mr-2 h-5 w-5" />
                   QR Code WhatsApp
                 </h2>
                 
                 <div className="text-center">
                   {console.log('🔍 Rendering QR section. sessionStatus:', sessionStatus, 'isConnected:', botConfig.isConnected, 'qrCodeImage:', qrCodeImage)}
                   {sessionStatus === 'connected' ? (
                     <div className="space-y-4">
                       <div className="w-48 h-48 mx-auto bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg flex flex-col items-center justify-center">
                         <FaCheckCircle className="h-16 w-16 text-green-500 mb-2" />
                         <p className="text-green-700 font-medium">WhatsApp Terhubung</p>
                         {botConfig.phoneNumber && (
                           <p className="text-sm text-green-600">{botConfig.phoneNumber}</p>
                         )}
                       </div>
                       <div className="flex space-x-2">
                         <button
                           onClick={disconnectWhatsApp}
                           disabled={loading}
                           className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 flex items-center justify-center text-sm disabled:opacity-50"
                         >
                           <FaTimesCircle className="h-4 w-4 mr-1" />
                           Disconnect
                         </button>
                         <button
                           onClick={testWhatsAppConnection}
                           className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center text-sm"
                         >
                           <FaCheckCircle className="h-4 w-4 mr-1" />
                           Test Status
                         </button>
                       </div>
                       <div className="text-xs text-gray-500">
                         Status: <span className="font-medium text-green-600">Terhubung</span>
                       </div>
                     </div>
                   ) : qrCodeImage ? (
                     <div className="space-y-4">
                       <img src={qrCodeImage} alt="WhatsApp QR Code" className="mx-auto w-48 h-48 border rounded-lg" />
                       <div className="flex space-x-2">
                         <button
                           onClick={downloadQRCode}
                           className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center text-sm"
                         >
                           <FaDownload className="h-4 w-4 mr-1" />
                           Download
                         </button>
                         <button
                           onClick={generateQRCode}
                           disabled={loading}
                           className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center text-sm disabled:opacity-50"
                         >
                           <FaSync className="h-4 w-4 mr-1" />
                           Refresh
                         </button>
                         <button
                           onClick={testWhatsAppConnection}
                           className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center text-sm"
                         >
                           <FaCheckCircle className="h-4 w-4 mr-1" />
                           {sessionStatus === 'pending' ? 'Simulate Scan' : 'Test Status'}
                         </button>
                       </div>
                       <div className="text-xs text-gray-500">
                         Status: <span className={`font-medium ${sessionStatus === 'connected' ? 'text-green-600' : sessionStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                           {sessionStatus === 'connected' ? 'Terhubung' : sessionStatus === 'pending' ? 'Menunggu' : 'Terputus'}
                         </span>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {console.log('🚀🚀🚀 RENDERING GENERATE QR CODE BUTTON! 🚀🚀🚀')}
                       <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                         <FaQrcode className="h-12 w-12 text-gray-400" />
                       </div>
                       <button
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           alert('Button clicked!');
                           console.log('🔥🔥🔥 BUTTON CLICKED! Calling generateQRCode... 🔥🔥🔥');
                           console.log('🔥 Button event triggered at:', new Date().toISOString());
                           console.log('🔥 Loading state:', loading);
                           console.log('🔥 About to call generateQRCode function...');
                           generateQRCode();
                           console.log('🔥 generateQRCode function called!');
                         }}
                         disabled={loading}
                         className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                       >
                         {loading ? (
                           <>
                             <FaSync className="h-4 w-4 mr-2 animate-spin" />
                             Generating...
                           </>
                         ) : (
                           <>
                             <FaQrcode className="h-4 w-4 mr-2" />
                             Generate QR Code
                           </>
                         )}
                       </button>
                       
                       {/* Test Button untuk debugging */}
                       <button
                         onClick={async () => {
                           console.log('🧪 TEST BUTTON CLICKED!');
                           console.log('🧪 Socket connected:', whatsappSocketService.isSocketConnected());
                           
                           try {
                             console.log('🧪 Testing direct whatsapp:initialize...');
                             await whatsappSocketService.initializeWhatsApp('test-session');
                             console.log('✅ Test successful!');
                             alert('Test successful! Check console for details.');
                           } catch (error) {
                             console.error('❌ Test failed:', error);
                             alert('Test failed: ' + error.message);
                           }
                         }}
                         className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
                       >
                         🧪 Test Socket.IO Connection
                       </button>
                     </div>
                   )}
                 </div>
               </div>
            </div>

            {/* Test Bot & Status */}
            <div className="lg:col-span-2">
              {/* Connection Status */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Koneksi</h2>
                {isDemoMode && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                    <div className="flex items-center">
                      <FaExclamationTriangle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Mode Demo Aktif</span>
                    </div>
                    <p className="text-xs mt-1">Backend WhatsApp tidak terhubung. Fitur WhatsApp berjalan dalam mode simulasi.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${botConfig.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">WhatsApp</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {botConfig.isConnected ? 'Terhubung' : 'Terputus'}
                          {isDemoMode && ' (Demo)'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${databaseAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Database</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{databaseAvailable ? 'Terhubung' : 'Terputus'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${botConfig.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Bot Status</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{botConfig.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Bot */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Bot</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pesan Test
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ketik pesan untuk test bot"
                        onKeyPress={(e) => e.key === 'Enter' && handleTestBot()}
                      />
                      <button
                        onClick={handleTestBot}
                        disabled={testLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {testLoading ? (
                          <FaSync className="h-4 w-4 animate-spin" />
                        ) : (
                          <FaPaperPlane className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {testResponse && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Respons Bot:</p>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm whitespace-pre-line">{testResponse}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Template Pesan</h2>
                <button
                  onClick={handleAddTemplate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <FaPlus className="h-4 w-4 mr-2" />
                  Tambah Template
                </button>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <FaComment className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada template pesan</p>
                  <button
                    onClick={handleAddTemplate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Tambah Template Pertama
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nama Template
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategori
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Konten
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {templates.map((template) => (
                        <tr key={template.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              template.category === 'welcome' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                              template.category === 'menu' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                              template.category === 'balance' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              template.category === 'loan' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                              template.category === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {template.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 truncate max-w-xs">{template.content}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              template.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {template.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(template.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MemberVerification 
              onVerificationComplete={(verification) => {
                safeToast.success(`Verifikasi berhasil untuk ${verification.member?.nama_lengkap}`)
                loadVerifications()
              }}
            />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Stats Cards */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaComment className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Pesan</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalMessages}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaUsers className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pengguna Aktif</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.activeUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FaCheckCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Anggota Terverifikasi</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.verifiedMembers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaChartBar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tingkat Respons</p>
                    <p className="text-2xl font-bold text-gray-900">98%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Analytics */}
            {transactionAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FaMoneyBillWave className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                      <p className="text-2xl font-bold text-gray-900">{transactionAnalytics.totalTransactions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FaWallet className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Nilai</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(transactionAnalytics.totalAmount)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FaCheckCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Transaksi Berhasil</p>
                      <p className="text-2xl font-bold text-gray-900">{transactionAnalytics.successfulTransactions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Transaksi Gagal</p>
                      <p className="text-2xl font-bold text-gray-900">{transactionAnalytics.failedTransactions}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Messages Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pesan per Hari (7 Hari Terakhir)</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.messagesByDay.map((day, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="bg-blue-500 w-full rounded-t"
                        style={{ height: `${Math.max((day.count / Math.max(...analytics.messagesByDay.map(d => d.count))) * 200, 4)}px` }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-medium text-gray-900">{day.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Commands */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Perintah Populer</h3>
                <div className="space-y-3">
                  {analytics.popularCommands.map((command, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{command.command}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(command.count / Math.max(...analytics.popularCommands.map(c => c.count))) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{command.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Pengaturan Keamanan</h2>
              
              <div className="space-y-6">
                {/* Rate Limiting */}
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Rate Limiting</h3>
                      <p className="text-sm text-gray-500">Batasi jumlah pesan per menit untuk mencegah spam</p>
                    </div>
                    <button 
                      onClick={() => setSecuritySettings(prev => ({ ...prev, rateLimitEnabled: !prev.rateLimitEnabled }))}
                      className={`flex items-center ${securitySettings.rateLimitEnabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {securitySettings.rateLimitEnabled ? (
                        <FaToggleOn className="h-6 w-6" />
                      ) : (
                        <FaToggleOff className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                  {securitySettings.rateLimitEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maksimal pesan per menit
                      </label>
                      <input
                        type="number"
                        value={securitySettings.maxMessagesPerMinute}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxMessagesPerMinute: parseInt(e.target.value) }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  )}
                </div>

                {/* Session Timeout */}
                <div className="border-b border-gray-200 pb-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Session Timeout</h3>
                    <p className="text-sm text-gray-500">Waktu timeout untuk sesi WhatsApp</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (menit)
                    </label>
                    <input
                      type="number"
                      value={securitySettings.sessionTimeoutMinutes}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) }))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="120"
                    />
                  </div>
                </div>

                {/* Encryption */}
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Enkripsi Data</h3>
                      <p className="text-sm text-gray-500">Enkripsi data sensitif dalam database</p>
                    </div>
                    <button 
                      onClick={() => setSecuritySettings(prev => ({ ...prev, encryptionEnabled: !prev.encryptionEnabled }))}
                      className={`flex items-center ${securitySettings.encryptionEnabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {securitySettings.encryptionEnabled ? (
                        <FaToggleOn className="h-6 w-6" />
                      ) : (
                        <FaToggleOff className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Audit Log */}
                 <div className="border-b border-gray-200 pb-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="text-sm font-medium text-gray-900">Audit Log</h3>
                       <p className="text-sm text-gray-500">Catat semua aktivitas untuk audit</p>
                     </div>
                     <button 
                       onClick={() => setSecuritySettings(prev => ({ ...prev, auditLogEnabled: !prev.auditLogEnabled }))}
                       className={`flex items-center ${securitySettings.auditLogEnabled ? 'text-green-600' : 'text-gray-400'}`}
                     >
                       {securitySettings.auditLogEnabled ? (
                         <FaToggleOn className="h-6 w-6" />
                       ) : (
                         <FaToggleOff className="h-6 w-6" />
                       )}
                     </button>
                   </div>
                 </div>

                 {/* Save Security Settings */}
                 <div className="pt-4">
                   <button
                     onClick={() => safeToast.success('Pengaturan keamanan berhasil disimpan!')}
                     className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                   >
                     <FaSave className="h-4 w-4 mr-2" />
                     Simpan Pengaturan
                   </button>
                 </div>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Template Form Modal */}
       <AnimatePresence>
         {showTemplateForm && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
           >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             >
               <div className="p-6">
                 <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-bold">
                     {currentTemplate ? 'Edit Template' : 'Tambah Template'}
                   </h2>
                   <button
                     onClick={() => setShowTemplateForm(false)}
                     className="text-gray-500 hover:text-gray-700"
                   >
                     <FaTimes className="h-5 w-5" />
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Nama Template
                     </label>
                     <input
                       type="text"
                       value={templateName}
                       onChange={(e) => setTemplateName(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="Nama template"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Kategori
                     </label>
                     <select
                       value={templateCategory}
                       onChange={(e) => setTemplateCategory(e.target.value as any)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                       <option value="welcome">Welcome</option>
                       <option value="menu">Menu</option>
                       <option value="balance">Balance</option>
                       <option value="loan">Loan</option>
                       <option value="error">Error</option>
                       <option value="help">Help</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Konten Template
                     </label>
                     <textarea
                       value={templateContent}
                       onChange={(e) => setTemplateContent(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       rows={6}
                       placeholder="Konten template pesan"
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       Gunakan \n untuk baris baru. Contoh: Baris 1\nBaris 2
                     </p>
                   </div>
                   
                   <div className="flex items-center justify-end gap-2 pt-2">
                     <button 
                       onClick={() => setShowTemplateForm(false)} 
                       className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                     >
                       Batal
                     </button>
                     <button
                       onClick={handleSaveTemplate}
                       className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                     >
                       Simpan
                     </button>
                   </div>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Confirm Delete Modal */}
       <AnimatePresence>
         {confirmDeleteId && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
           >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-lg shadow-xl w-full max-w-md"
             >
               <div className="p-6">
                 <div className="flex items-start mb-4">
                   <div className="flex-shrink-0 text-red-500">
                     <FaTrash className="h-6 w-6" />
                   </div>
                   <div className="ml-3">
                     <h4 className="text-base font-semibold text-gray-900">Hapus Template?</h4>
                     <p className="text-sm text-gray-600 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
                   </div>
                 </div>
                 <div className="flex items-center justify-end gap-2 mt-6">
                   <button 
                     onClick={() => setConfirmDeleteId(null)} 
                     className="px-4 py-2 rounded border"
                   >
                     Batal
                   </button>
                   <button 
                     onClick={() => handleDeleteTemplate(confirmDeleteId)} 
                     className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                   >
                     Hapus
                   </button>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>


     </div>
   )
 }

 export default WhatsAppBotPage