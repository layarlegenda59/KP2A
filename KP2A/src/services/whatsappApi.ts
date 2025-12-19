import { io, Socket } from 'socket.io-client';

export interface WhatsAppMessage {
  id: string;
  from_number: string;
  to_number: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  direction: 'inbound' | 'outbound';
  created_at: string;
  is_read: boolean;
}

export interface WhatsAppSession {
  id: string;
  session_id: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  qr_code?: string;
  connected_at?: string;
  expires_at?: string;
}

export interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  qr_code?: string;
  session_id?: string;
  phone_number?: string;
}

class WhatsAppApiService {
  private socket: Socket | null = null;
  private baseUrl: string;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Use centralized resolver for base URL
    try {
      const { resolveSocketBaseUrl } = require('../utils/socketUrl');
      const { baseUrl } = resolveSocketBaseUrl();
      this.baseUrl = baseUrl;
    } catch (e) {
      this.baseUrl = import.meta.env.VITE_WHATSAPP_SOCKET_URL || 
                     import.meta.env.VITE_SOCKET_URL || 
                     import.meta.env.VITE_WHATSAPP_API_URL || 
                     'https://sidarsih.site';
    }
    
    console.log('🔧 WhatsApp API Service Configuration:', {
      baseUrl: this.baseUrl,
      environment: import.meta.env.MODE
    });
    
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(this.baseUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WhatsApp backend');
      this.emit('connection', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WhatsApp backend');
      this.emit('connection', { connected: false });
    });

    this.socket.on('qr-code', (data: { qr_code: string; session_id: string }) => {
      console.log('QR Code received:', data);
      this.emit('qr-code', data);
    });

    this.socket.on('status-update', (data: WhatsAppStatus) => {
      console.log('Status update:', data);
      this.emit('status-update', data);
    });

    this.socket.on('message-received', (data: WhatsAppMessage) => {
      console.log('Message received:', data);
      this.emit('message-received', data);
    });

    this.socket.on('message-sent', (data: WhatsAppMessage) => {
      console.log('Message sent:', data);
      this.emit('message-sent', data);
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Connection management
  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // WhatsApp operations
  async initializeWhatsApp(sessionId: string = 'default'): Promise<void> {
    try {
      // Try HTTP method first as fallback
      return await this.initializeWhatsAppHttp(sessionId);
    } catch (error) {
      // If HTTP fails, try Socket.IO
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized and HTTP failed'));
          return;
        }

        this.socket.emit('initialize-whatsapp', { sessionId }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error || 'Failed to initialize WhatsApp'));
          }
        });
      });
    }
  }

  async getQRCode(sessionId: string = 'default'): Promise<string> {
    try {
      // Try HTTP method first as fallback
      return await this.getQRCodeHttp(sessionId);
    } catch (error) {
      // If HTTP fails, try Socket.IO
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized and HTTP failed'));
          return;
        }

        this.socket.emit('get-qr-code', { sessionId }, (response: any) => {
          if (response.success && response.qr_code) {
            resolve(response.qr_code);
          } else {
            reject(new Error(response.error || 'Failed to get QR code'));
          }
        });
      });
    }
  }

  async getStatus(sessionId: string = 'default'): Promise<WhatsAppStatus> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('get-status', { sessionId }, (response: any) => {
        if (response.success) {
          resolve(response.status);
        } else {
          reject(new Error(response.error || 'Failed to get status'));
        }
      });
    });
  }

  async sendMessage(to: string, message: string, sessionId: string = 'default'): Promise<WhatsAppMessage> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('send-message', { to, message, sessionId }, (response: any) => {
        if (response.success) {
          resolve(response.message);
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }

  async getMessages(sessionId: string = 'default', limit: number = 50): Promise<WhatsAppMessage[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('get-messages', { sessionId, limit }, (response: any) => {
        if (response.success) {
          resolve(response.messages);
        } else {
          reject(new Error(response.error || 'Failed to get messages'));
        }
      });
    });
  }

  async disconnectWhatsApp(sessionId: string = 'default'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('disconnect-whatsapp', { sessionId }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to disconnect WhatsApp'));
        }
      });
    });
  }

  // HTTP API fallback methods with graceful error handling
  async getStatusHttp(sessionId: string = 'default'): Promise<WhatsAppStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/whatsapp/status?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get status');
      }
      
      return data;
    } catch (error) {
      console.warn('⚠️ Backend unavailable, returning demo status:', error);
      
      // Return demo status when backend is unavailable
      return {
        status: 'disconnected',
        session_id: sessionId,
        phone_number: undefined,
        qr_code: undefined
      };
    }
  }

  async initializeWhatsAppHttp(sessionId: string = 'default'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/whatsapp/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal: AbortSignal.timeout(15000) // 15 second timeout for initialization
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize WhatsApp');
      }
    } catch (error) {
      console.warn('⚠️ Backend unavailable, initialization skipped:', error);
      // In demo mode, we don't throw an error for initialization
      // This allows the frontend to continue working in demo mode
    }
  }

  async getQRCodeHttp(sessionId: string = 'default'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/qr`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get QR code');
    }
    
    if (!data.data.hasQR || !data.data.qrCode) {
      throw new Error('QR code not available');
    }
    
    return data.data.qrCode;
  }

  async sendMessageHttp(to: string, message: string, sessionId: string = 'default'): Promise<WhatsAppMessage> {
    try {
      const response = await fetch(`${this.baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, message, sessionId }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      return data.message;
    } catch (error) {
      console.warn('⚠️ Backend unavailable, returning demo message:', error);
      
      // Return demo message when backend is unavailable
      return {
        id: `demo_${Date.now()}`,
        from_number: 'demo',
        to_number: to,
        content: message,
        message_type: 'text',
        direction: 'outbound',
        created_at: new Date().toISOString(),
        is_read: false
      };
    }
  }

  async getMessagesHttp(sessionId: string = 'default', limit: number = 50): Promise<WhatsAppMessage[]> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/messages?sessionId=${sessionId}&limit=${limit}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get messages');
    }
    
    return data.messages;
  }

  async disconnectWhatsAppHttp(sessionId: string = 'default'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/whatsapp/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to disconnect WhatsApp');
    }
  }
}

// Export singleton instance
const whatsappApiService = new WhatsAppApiService();
export { whatsappApiService };
export default whatsappApiService;