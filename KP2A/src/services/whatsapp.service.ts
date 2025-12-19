import { io, Socket } from 'socket.io-client';

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

class WhatsAppService {
  private socket: Socket | null = null;
  private baseUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'https://sidarsih.site';

  // Socket.IO connection
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.baseUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to WhatsApp backend');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WhatsApp backend');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  onStatusChange(callback: (status: WhatsAppStatus) => void): void {
    if (this.socket) {
      this.socket.on('whatsapp-status', callback);
    }
  }

  onQRCode(callback: (qrCode: string) => void): void {
    if (this.socket) {
      this.socket.on('qr-code', callback);
    }
  }

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    if (this.socket) {
      this.socket.on('whatsapp-message', callback);
    }
  }

  // HTTP methods as fallback
  async initializeWhatsAppHttp(sessionId: string = 'default'): Promise<void> {
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

  async getQRCodeHttp(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/qr-code`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get QR code');
    }

    return data.qr_code;
  }

  async getStatusHttp(): Promise<WhatsAppStatus> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/status`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get status');
    }

    return data;
  }

  // Socket methods
  async initializeWhatsApp(sessionId: string = 'default'): Promise<void> {
    if (!this.socket) this.connect();
    this.socket?.emit('initialize-whatsapp', { sessionId });
  }

  async getQRCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) this.connect();

      this.socket?.once('qr-code', (data: { qr_code: string }) => {
        resolve(data.qr_code);
      });

      setTimeout(() => reject(new Error('Timeout getting QR code')), 20000);
    });
  }

  async getStatus(): Promise<WhatsAppStatus> {
    return new Promise((resolve, reject) => {
      if (!this.socket) this.connect();

      this.socket?.once('whatsapp-status', (status: WhatsAppStatus) => {
        resolve(status);
      });

      setTimeout(() => reject(new Error('Timeout getting status')), 20000);
    });
  }

  async sendMessage(to: string, message: string, sessionId: string = 'default'): Promise<void> {
    if (!this.socket) this.connect();

    this.socket?.emit('send-whatsapp-message', {
      to,
      message,
      sessionId,
    });
  }
}

const whatsappService = new WhatsAppService();
export default whatsappService;