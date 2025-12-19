import whatsappSocketServiceOriginal from './whatsapp-socket.service';

// Wrapper service to match the interface expected by WhatsAppMobileConnection component
class WhatsAppSocketServiceWrapper {
  private originalService = whatsappSocketServiceOriginal;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Setup forwarding of events from original service
    this.setupEventForwarding();
  }

  private setupEventForwarding() {
    // Forward status changes
    this.originalService.onStatusChange((status) => {
      this.emit('whatsapp:status', status);
      
      if (status.status === 'ready') {
        this.emit('whatsapp:ready', {
          phoneNumber: status.phoneNumber,
          clientName: status.phoneNumber, // Use phone number as client name if not available
          timestamp: status.timestamp
        });
      }
      
      if (status.status === 'disconnected') {
        this.emit('whatsapp:disconnected', {});
      }
      
      if (status.status === 'error') {
        this.emit('whatsapp:error', { message: status.message });
      }
    });

    // Forward QR codes
    this.originalService.onQRCode((qrCode) => {
      this.emit('whatsapp:qr', { qr: qrCode });
    });

    // Forward messages
    this.originalService.onMessage((message) => {
      this.emit('whatsapp:message', {
        id: message.id,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: new Date(message.timestamp).getTime() / 1000, // Convert to seconds
        type: message.type,
        isGroup: false // Assume not group for now
      });
    });

    // Forward connection status
    this.originalService.onConnection((connected) => {
      if (connected) {
        this.emit('whatsapp:ready', {
          phoneNumber: 'Connected',
          clientName: 'WhatsApp Client',
          timestamp: new Date().toISOString()
        });
      } else {
        this.emit('whatsapp:disconnected', {});
      }
    });
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Public API methods
  async connect() {
    try {
      // The original service auto-connects, so we just need to ensure it's ready
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      this.originalService.destroy();
      this.emit('whatsapp:disconnected', {});
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }

  async initialize() {
    try {
      await this.originalService.initializeWhatsApp('mobile-connection');
      this.emit('whatsapp:status', {
        status: 'initializing',
        isConnected: false,
        timestamp: new Date().toISOString(),
        message: 'Initializing WhatsApp connection...'
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.emit('whatsapp:error', { message: error.message });
      throw error;
    }
  }

  async generateQRCode() {
    try {
      await this.originalService.generateQRCode('mobile-connection');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      this.emit('whatsapp:error', { message: error.message });
      throw error;
    }
  }

  async logout() {
    try {
      await this.originalService.logout('mobile-connection');
      this.emit('whatsapp:disconnected', {});
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const status = await this.originalService.getStatus('mobile-connection');
      return {
        isConnected: status.isConnected,
        phoneNumber: status.phoneNumber,
        lastSeen: status.timestamp
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        isConnected: false,
        phoneNumber: undefined,
        lastSeen: undefined
      };
    }
  }

  async sendMessage(to: string, message: string) {
    try {
      await this.originalService.sendMessage(to, message, 'mobile-connection');
      this.emit('whatsapp:message_sent', {
        to,
        message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('whatsapp:error', { message: error.message });
      throw error;
    }
  }

  async getContacts() {
    try {
      const contacts = await this.originalService.getContacts('mobile-connection');
      this.emit('whatsapp:contacts', contacts);
      return contacts;
    } catch (error) {
      console.error('Failed to get contacts:', error);
      this.emit('whatsapp:error', { message: error.message });
      return [];
    }
  }
}

// Create and export singleton instance
export const whatsappSocketService = new WhatsAppSocketServiceWrapper();
export default whatsappSocketService;