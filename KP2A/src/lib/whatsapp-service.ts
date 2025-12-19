import { supabase } from './supabase'
import QRCode from 'qrcode'
import { whatsappWebClient, type WhatsAppWebSession } from './whatsapp-web-client'

export interface QRCodeRequest {
  sessionId?: string
}

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

export class WhatsAppService {
  async generateQRCode(request: QRCodeRequest = {}): Promise<QRCodeResponse> {
    try {
      // Generate new session using the WhatsApp Web client
      const session = whatsappWebClient.generateSession()
      
      // Generate QR code data URL from the realistic QR data
      const qrCodeDataUrl = await QRCode.toDataURL(session.qrCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      // Save session to database
      const { error } = await supabase
        .from('whatsapp_sessions')
        .insert({
          session_id: session.sessionId,
          qr_code_data: session.qrCode,
          status: session.status,
          expires_at: session.expiresAt.toISOString()
        })

      if (error) {
        console.warn('Failed to save session to database:', error)
        // Continue anyway as the session is still valid in memory
      }

      return {
        sessionId: session.sessionId,
        qrCodeDataUrl,
        expiresAt: session.expiresAt.toISOString(),
        status: session.status
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  async getSessionStatus(sessionId: string): Promise<{ status: 'pending' | 'connected' | 'expired' }> {
    const session = whatsappWebClient.getSession(sessionId)
    
    if (!session) {
      return { status: 'expired' }
    }
    
    return { status: session.status }
  }

  async connectSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const result = whatsappWebClient.simulateScan(sessionId)
    
    if (result.success) {
      // Update database status
      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'connected' })
        .eq('session_id', sessionId)
    }
    
    return result
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppMessage> {
    try {
      // Create message record
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

  // Simulate receiving a message (for testing)
  async simulateIncomingMessage(phoneNumber: string, message: string): Promise<WhatsAppMessage> {
    try {
      const messageData = {
        phone_number: phoneNumber,
        message: message,
        message_type: 'text' as const,
        direction: 'inbound' as const,
        status: 'received'
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
      console.error('Error simulating incoming message:', error)
      throw new Error('Failed to simulate incoming message')
    }
  }
}

export const whatsappService = new WhatsAppService()