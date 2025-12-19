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

class BrowserWhatsAppService {
  private connectionStatus: ConnectionStatus = {
    status: 'disconnected',
    isConnected: false
  }
  private sessionId: string = ''
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = []

  constructor() {
    this.sessionId = `browser_session_${Date.now()}`
  }

  private generateWhatsAppQRData(): string {
    // Generate a more realistic WhatsApp QR code format
    // This simulates the actual WhatsApp Web QR format which is base64 encoded JSON
    const timestamp = Date.now()
    const serverToken = this.generateRandomString(32)
    const clientToken = this.generateRandomString(32)
    const browserToken = this.generateRandomString(16)
    
    // Create a realistic WhatsApp Web QR data structure
    const qrData = {
      ref: serverToken,
      ttl: 300000, // 5 minutes
      ts: timestamp,
      clientToken: clientToken,
      browserToken: browserToken,
      server: "web.whatsapp.com",
      version: [2, 2413, 51]
    }
    
    // Encode as base64 to simulate real WhatsApp QR format
    return btoa(JSON.stringify(qrData))
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private notifyStatusCallbacks(): void {
    this.statusCallbacks.forEach(callback => callback(this.connectionStatus))
  }

  private async saveSessionToDatabase(): Promise<void> {
    try {
      const sessionData = {
        session_id: this.sessionId,
        qr_code_data: 'browser_generated',
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

  async generateQRCode(): Promise<QRCodeResponse> {
    try {
      // Generate realistic WhatsApp QR data
      const qrData = this.generateWhatsAppQRData()
      
      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })

      const expiresAt = new Date(Date.now() + 300000) // 5 minutes
      this.sessionId = `browser_session_${Date.now()}`

      this.connectionStatus = {
        status: 'pending',
        isConnected: false,
        lastActivity: new Date().toISOString()
      }

      // Save session to database
      await this.saveSessionToDatabase()

      // Auto-expire after 5 minutes
      setTimeout(() => {
        if (this.connectionStatus.status === 'pending') {
          this.connectionStatus = {
            status: 'expired',
            isConnected: false,
            lastActivity: new Date().toISOString()
          }
          this.notifyStatusCallbacks()
        }
      }, 300000)

      return {
        sessionId: this.sessionId,
        qrCodeDataUrl,
        expiresAt: expiresAt.toISOString(),
        status: 'pending'
      }
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

  // Simulate connection for testing
  async simulateConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.connectionStatus.status !== 'pending') {
        return { success: false, message: 'Tidak ada session pending' }
      }

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      this.connectionStatus = {
        status: 'connected',
        isConnected: true,
        lastActivity: new Date().toISOString()
      }

      this.notifyStatusCallbacks()
      await this.saveSessionToDatabase()

      return { success: true, message: 'WhatsApp berhasil terhubung!' }
    } catch (error) {
      console.error('Error simulating connection:', error)
      return { success: false, message: 'Gagal mensimulasikan koneksi' }
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppMessage> {
    try {
      if (!this.connectionStatus.isConnected) {
        throw new Error('WhatsApp not connected')
      }

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
      this.connectionStatus = {
        status: 'disconnected',
        isConnected: false,
        lastActivity: new Date().toISOString()
      }
      
      this.notifyStatusCallbacks()
      await this.saveSessionToDatabase()
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  cleanup(): void {
    this.statusCallbacks = []
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
export const browserWhatsAppService = new BrowserWhatsAppService();
export default BrowserWhatsAppService;