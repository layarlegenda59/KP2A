export interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'qr' | 'loading';
  isConnected: boolean;
  timestamp: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'document';
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

class WhatsAppSimpleService {
  private baseUrl = (() => {
    try {
      const { resolveHttpBaseUrl } = require('../utils/socketUrl');
      const { baseUrl } = resolveHttpBaseUrl();
      return baseUrl;
    } catch (e) {
      return import.meta.env.VITE_WHATSAPP_API_URL || 'https://sidarsih.site';
    }
  })();

  // Initialize WhatsApp connection
  async initializeWhatsApp(sessionId: string = 'default'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to initialize WhatsApp');
    }
  }

  // Get QR code
  async getQRCode(): Promise<string> {
    // First check if already connected
    try {
      const status = await this.getStatus();
      if (status.isConnected) {
        throw new Error('WhatsApp sudah terhubung. Tidak perlu QR code.');
      }
    } catch (statusError) {
      // If status check fails, continue with QR request
      console.warn('Could not check status before QR request:', statusError);
    }

    const response = await fetch(`${this.baseUrl}/api/whatsapp/qr`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get QR code');
    }
    
    if (!data.data.hasQR || !data.data.qrCode) {
      // Check if it's because already connected
      if (data.data.status === 'connected') {
        throw new Error('WhatsApp sudah terhubung. Tidak perlu QR code.');
      }
      throw new Error('QR code belum tersedia. Silakan coba lagi.');
    }
    
    return data.data.qrCode;
  }

  // Get status
  async getStatus(): Promise<WhatsAppStatus> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/status`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get status');
    }
    
    return data.data;
  }

  // Send message
  async sendMessage(to: string, message: string, sessionId: string = 'default'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message, sessionId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send message');
    }
  }

  // Dummy methods for compatibility
  connect(): void {
    console.log('WhatsApp service connected (HTTP mode)');
  }

  disconnect(): void {
    console.log('WhatsApp service disconnected');
  }

  onStatusChange(callback: (status: WhatsAppStatus) => void): void {
    // For now, we'll poll status periodically
    console.log('Status change listener registered');
  }

  onQRCode(callback: (qrCode: string) => void): void {
    console.log('QR code listener registered');
  }

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    console.log('Message listener registered');
  }
}

// Create and export singleton instance
const whatsappSimpleService = new WhatsAppSimpleService();
export default whatsappSimpleService;