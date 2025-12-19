import makeWASocket, { 
  ConnectionState, 
  DisconnectReason, 
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  proto
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import QRCode from 'qrcode'
import { supabase } from './supabase'

export interface QRCodeResponse {
  sessionId: string
  qrCodeDataUrl: string
  expiresAt: string
  status: 'pending' | 'connected' | 'expired'
}

export interface WhatsAppMessage {
  id: string
  phone_number: string
  message: string
  message_type: 'text' | 'image' | 'document'
  direction: 'inbound' | 'outbound'
  created_at: string
  status?: string
}

export interface ConnectionStatus {
  status: 'pending' | 'connected' | 'disconnected' | 'expired'
  isConnected: boolean
  lastActivity?: string
}

class BaileysWhatsAppService {
  private sock: WASocket | null = null
  private qrCode: string = ''
  private connectionStatus: ConnectionStatus = {
    status: 'disconnected',
    isConnected: false
  }
  private sessionId: string = ''
  private qrCodeCallbacks: ((qr: string) => void)[] = []
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = []
  private logger: any

  constructor() {
    this.logger = P({ level: 'silent' }) // Silent logger for production
    this.sessionId = `baileys_session_${Date.now()}`
  }

  async initialize(): Promise<void> {
    try {
      // Use multi-file auth state for session persistence
      const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
      
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR display ourselves
        logger: this.logger,
        browser: ['KP2A Cimahi Bot', 'Chrome', '1.0.0']
      })

      // Handle connection updates
      this.sock.ev.on('connection.update', (update) => {
        this.handleConnectionUpdate(update)
      })

      // Handle credentials update
      this.sock.ev.on('creds.update', saveCreds)

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', (m) => {
        this.handleIncomingMessages(m)
      })

    } catch (error) {
      console.error('Error initializing Baileys:', error)
      throw error
    }
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      this.qrCode = qr
      this.connectionStatus = {
        status: 'pending',
        isConnected: false,
        lastActivity: new Date().toISOString()
      }
      
      // Notify all QR code callbacks
      this.qrCodeCallbacks.forEach(callback => callback(qr))
      this.notifyStatusCallbacks()
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      
      this.connectionStatus = {
        status: 'disconnected',
        isConnected: false,
        lastActivity: new Date().toISOString()
      }
      
      console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
      
      if (shouldReconnect) {
        this.initialize()
      }
      
      this.notifyStatusCallbacks()
    } else if (connection === 'open') {
      this.connectionStatus = {
        status: 'connected',
        isConnected: true,
        lastActivity: new Date().toISOString()
      }
      
      console.log('WhatsApp connection opened successfully')
      this.notifyStatusCallbacks()
      
      // Save session to database
      this.saveSessionToDatabase()
    }
  }

  private async handleIncomingMessages(m: any) {
    const message = m.messages[0]
    if (!message.key.fromMe && message.message) {
      try {
        const phoneNumber = message.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
        const messageText = message.message.conversation || 
                           message.message.extendedTextMessage?.text || 
                           'Media message'

        // Save to database
        await this.saveIncomingMessage(phoneNumber, messageText)
        
        console.log('Incoming message from', phoneNumber, ':', messageText)
      } catch (error) {
        console.error('Error handling incoming message:', error)
      }
    }
  }

  private async saveIncomingMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const messageData = {
        phone_number: phoneNumber,
        message: message,
        message_type: 'text' as const,
        direction: 'inbound' as const,
        status: 'received'
      }

      await supabase
        .from('whatsapp_messages')
        .insert(messageData)
    } catch (error) {
      console.error('Error saving incoming message:', error)
    }
  }

  private async saveSessionToDatabase(): Promise<void> {
    try {
      const sessionData = {
        session_id: this.sessionId,
        qr_code_data: this.qrCode,
        status: this.connectionStatus.status,
        expires_at: new Date(Date.now() + 300000).toISOString() // 5 minutes
      }

      await supabase
        .from('whatsapp_sessions')
        .upsert(sessionData, { onConflict: 'session_id' })
    } catch (error) {
      console.error('Error saving session to database:', error)
    }
  }

  private notifyStatusCallbacks(): void {
    this.statusCallbacks.forEach(callback => callback(this.connectionStatus))
  }

  async generateQRCode(): Promise<QRCodeResponse> {
    try {
      if (!this.sock) {
        await this.initialize()
      }

      // Wait for QR code to be generated
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('QR code generation timeout'))
        }, 30000) // 30 second timeout

        const qrCallback = async (qr: string) => {
          try {
            clearTimeout(timeout)
            
            // Generate QR code data URL
            const qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            })

            const expiresAt = new Date(Date.now() + 300000) // 5 minutes

            // Remove callback
            this.qrCodeCallbacks = this.qrCodeCallbacks.filter(cb => cb !== qrCallback)

            resolve({
              sessionId: this.sessionId,
              qrCodeDataUrl,
              expiresAt: expiresAt.toISOString(),
              status: 'pending'
            })
          } catch (error) {
            clearTimeout(timeout)
            reject(error)
          }
        }

        // Add callback for QR code
        this.qrCodeCallbacks.push(qrCallback)

        // If QR code already available, use it immediately
        if (this.qrCode) {
          qrCallback(this.qrCode)
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback)
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppMessage> {
    try {
      if (!this.sock || !this.connectionStatus.isConnected) {
        throw new Error('WhatsApp not connected')
      }

      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`
      
      await this.sock.sendMessage(jid, { text: message })

      // Save to database
      const messageData = {
        phone_number: phoneNumber,
        message: message,
        message_type: 'text' as const,
        direction: 'outbound' as const,
        status: 'sent'
      }

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert(messageData)
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        id: data.id,
        phone_number: data.phone_number,
        message: data.message,
        message_type: data.message_type,
        direction: data.direction,
        created_at: data.created_at,
        status: data.status
      }
    } catch (error) {
      console.error('Error sending message:', error)
      throw new Error('Failed to send message')
    }
  }

  async getMessages(phoneNumber?: string): Promise<WhatsAppMessage[]> {
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (phoneNumber) {
        query = query.eq('phone_number', phoneNumber)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw new Error('Failed to fetch messages')
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout()
        this.sock = null
      }
      
      this.connectionStatus = {
        status: 'disconnected',
        isConnected: false,
        lastActivity: new Date().toISOString()
      }
      
      this.notifyStatusCallbacks()
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  cleanup(): void {
    this.qrCodeCallbacks = []
    this.statusCallbacks = []
    if (this.sock) {
      this.sock.end(undefined)
      this.sock = null
    }
  }

  // Get message templates from database
  async getTemplates(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) {
        console.error('Error fetching templates:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getTemplates:', error)
      return []
    }
  }

  // Get WhatsApp verifications from database
  async getVerifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_verifications')
        .select(`
          *,
          members (
            nama_lengkap,
            no_hp,
            status_keanggotaan
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching verifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getVerifications:', error)
      return []
    }
  }

  // Get WhatsApp analytics data
  async getAnalytics(): Promise<any> {
    try {
      // Get analytics data from whatsapp_analytics table
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .order('analytics_date', { ascending: false })
        .limit(30) // Last 30 days

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError)
      }

      // Get message statistics
      const { data: messageStats, error: messageError } = await supabase
        .from('whatsapp_messages')
        .select('direction, created_at, message_type')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (messageError) {
        console.error('Error fetching message stats:', messageError)
      }

      // Get verification statistics
      const { data: verificationStats, error: verificationError } = await supabase
        .from('whatsapp_verifications')
        .select('is_verified, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (verificationError) {
        console.error('Error fetching verification stats:', verificationError)
      }

      // Process and return analytics data
      const totalMessages = messageStats?.length || 0
      const inboundMessages = messageStats?.filter(m => m.direction === 'inbound').length || 0
      const outboundMessages = messageStats?.filter(m => m.direction === 'outbound').length || 0
      const totalVerifications = verificationStats?.length || 0
      const verifiedUsers = verificationStats?.filter(v => v.is_verified).length || 0

      return {
        analytics: analyticsData || [],
        summary: {
          totalMessages,
          inboundMessages,
          outboundMessages,
          totalVerifications,
          verifiedUsers,
          verificationRate: totalVerifications > 0 ? (verifiedUsers / totalVerifications * 100).toFixed(1) : '0'
        },
        messageStats: messageStats || [],
        verificationStats: verificationStats || []
      }
    } catch (error) {
      console.error('Error in getAnalytics:', error)
      return {
        analytics: [],
        summary: {
          totalMessages: 0,
          inboundMessages: 0,
          outboundMessages: 0,
          totalVerifications: 0,
          verifiedUsers: 0,
          verificationRate: '0'
        },
        messageStats: [],
        verificationStats: []
      }
    }
  }
}

// Export singleton instance
export const baileysWhatsAppService = new BaileysWhatsAppService()