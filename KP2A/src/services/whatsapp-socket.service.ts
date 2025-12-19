import { io, Socket } from 'socket.io-client';
import { resolveSocketBaseUrl } from '../utils/socketUrl'
// Updated to fix ERR_ABORTED issues

// Interfaces
export interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'loading' | 'ready' | 'error' | 'initializing' | 'reconnecting';
  isConnected: boolean;
  timestamp: string;
  message?: string;
  phoneNumber?: string;
  sessionId?: string;
  lastSeen?: string;
  reconnectAttempts?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  isFromMe: boolean;
  sessionId?: string;
  contact?: {
    name?: string;
    pushname?: string;
    number: string;
  };
}

export interface QRCodeData {
  qrCode: string;
  sessionId: string;
  timestamp: string;
}

export interface WhatsAppContact {
  id: string;
  name?: string;
  pushname?: string;
  number: string;
  isMyContact: boolean;
  profilePicUrl?: string;
}

export interface WhatsAppSettings {
  auto_reply_enabled: boolean;
  auto_reply_message: string;
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  welcome_message_enabled: boolean;
  welcome_message: string;
  session_timeout: number;
}

class WhatsAppSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private baseReconnectDelay: number = 1000; // 1 second base delay
  private maxReconnectDelay: number = 30000; // 30 seconds max delay
  
  // Environment configuration
  private readonly socketUrl: string;
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;
  private readonly demoModeDisabled: boolean;
  
  // Callback arrays
  private statusCallbacks: Array<(status: WhatsAppStatus) => void> = [];
  private qrCodeCallbacks: Array<(qrCode: string) => void> = [];
  private messageCallbacks: Array<(message: WhatsAppMessage) => void> = [];
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  constructor() {
    // Resolve Socket.IO base URL via centralized resolver
    try {
      const { baseUrl } = resolveSocketBaseUrl();
      this.socketUrl = baseUrl;
    } catch (e) {
      // Fallback when resolver not available
      this.socketUrl = import.meta.env.VITE_WHATSAPP_SOCKET_URL || 'https://sidarsih.site';
    }

    this.isDevelopment = import.meta.env.DEV || false;
    this.isProduction = import.meta.env.VITE_NODE_ENV === 'production';
    this.demoModeDisabled = import.meta.env.VITE_DISABLE_DEMO_MODE === 'true';
    
    console.log('🔧 WhatsApp Socket Service Configuration:', {
      socketUrl: this.socketUrl,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      demoModeDisabled: this.demoModeDisabled,
      maxReconnectAttempts: this.maxReconnectAttempts
    });
    
    this.initializeSocket();
  }

  private initializeSocket(): void {
    console.log('🔌 Initializing Socket.IO connection to backend...', this.socketUrl);
    
    // Clean up existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
    }
    
    // Clear any existing timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Initialize socket connection with improved configuration
    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'], // Prefer websocket first
      timeout: 8000,
      reconnection: false, // Disable auto-reconnection to use custom logic
      autoConnect: false,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false,
      rejectUnauthorized: false,
      closeOnBeforeunload: false,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventListeners();
    
    // Try to connect with timeout and fallback to demo mode
    this.attemptConnectionWithFallback();
  }

  private getCandidateUrls(): string[] {
    try {
      const primary = resolveSocketBaseUrl().baseUrl;
      const env = (import.meta as any).env || {};
      const extras = [
        env.VITE_WHATSAPP_SOCKET_URL,
        env.VITE_SOCKET_URL,
        env.VITE_WHATSAPP_API_URL,
        env.VITE_API_URL,
        'https://backend.sidarsih.site',
        'https://api.sidarsih.site',
        'https://whatsapp.sidarsih.site',
        'https://sidarsih.site'
      ].filter(Boolean);
      const uniq = Array.from(new Set([primary, ...extras]));
      return uniq.map((u: string) => u.replace(/\/$/, ''));
    } catch {
      return [this.socketUrl];
    }
  }

  private async attemptConnectionWithFallback(): Promise<void> {
    try {
      console.log(`🔄 Attempting to connect to WhatsApp backend... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.isConnected = false;

      // Build candidate list and pick based on attempt index
      const candidates = this.getCandidateUrls();
      const idx = Math.min(this.reconnectAttempts, candidates.length - 1);
      const targetUrl = candidates[idx] || this.socketUrl;
      if (this.socketUrl !== targetUrl) {
        console.log(`🌐 Switching socket base URL to: ${targetUrl}`);
        this.socketUrl = targetUrl;
        // Recreate socket with new URL
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = io(this.socketUrl, {
          transports: ['websocket', 'polling'],
          timeout: 8000,
          reconnection: false,
          autoConnect: false,
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          rejectUnauthorized: false,
          closeOnBeforeunload: false,
          pingTimeout: 60000,
          pingInterval: 25000
        });
        this.setupEventListeners();
      }

      // Try websocket first, then fallback to polling if error occurs
      this.socket?.connect();

      await new Promise((resolve, reject) => {
        const timeoutDuration = this.isDevelopment ? 3000 : 5000;
        this.connectionTimeout = setTimeout(() => {
          reject(new Error(`Connection timeout after ${timeoutDuration}ms - backend not available`));
        }, timeoutDuration);

        const onConnect = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.socket?.off('connect_error', onError);
          resolve(true);
        };

        const onError = (error: any) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.socket?.off('connect', onConnect);
          // If websocket fails immediately, try forcing polling once
          if (this.socket && Array.isArray((this.socket as any).io?.opts?.transports)) {
            const opts = (this.socket as any).io.opts;
            if (opts.transports[0] === 'websocket') {
              console.warn('⚠️ WebSocket transport failed, retrying with polling');
              opts.transports = ['polling', 'websocket'];
              this.socket.connect();
              return; // Let timeout/retry handle
            }
          }
          reject(error);
        };

        this.socket?.once('connect', onConnect);
        this.socket?.once('connect_error', onError);
      });

      console.log('✅ Connected to WhatsApp backend successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      this.reconnectAttempts++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.log(`❌ Connection attempt ${this.reconnectAttempts} failed:`, errorMessage);
      this.socket?.disconnect();

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        console.log(`🔄 Retrying connection in ${delay}ms...`);
        const reconnectingStatus: WhatsAppStatus = {
          status: 'reconnecting',
          isConnected: false,
          timestamp: new Date().toISOString(),
          message: `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
          reconnectAttempts: this.reconnectAttempts,
          connectionStatus: 'reconnecting'
        };
        this.notifyStatusCallbacks(reconnectingStatus);
        this.reconnectTimeout = setTimeout(() => {
          this.attemptConnectionWithFallback();
        }, delay);
      } else {
        if (this.demoModeDisabled || this.isProduction) {
          console.error('❌ Max reconnection attempts reached. Demo mode is disabled in production.');
          const errorStatus: WhatsAppStatus = {
            status: 'error',
            isConnected: false,
            timestamp: new Date().toISOString(),
            message: 'WhatsApp backend connection failed. Please check backend service.',
            connectionStatus: 'failed'
          };
          this.notifyStatusCallbacks(errorStatus);
        } else {
          console.log('⚠️ Max reconnection attempts reached, enabling demo mode');
          this.enableDemoMode();
        }
      }
    }
  }

  private enableDemoMode(): void {
    console.log('🎭 Enabling WhatsApp demo mode (no backend required)');
    this.isConnected = false; // Keep as false to indicate demo mode
    
    // Notify that we're in demo mode
    const demoStatus: WhatsAppStatus = {
      status: 'disconnected',
      isConnected: false,
      timestamp: new Date().toISOString(),
      message: 'WhatsApp backend not available - Demo mode enabled',
      connectionStatus: 'disconnected'
    };
    this.notifyStatusCallbacks(demoStatus);
  }

  private handleDemoModeOperation(operationName: string): Promise<any> {
    // Check if we're in strict production mode (deployed environment)
    const isStrictProduction = this.isProduction && this.demoModeDisabled;
    
    if (isStrictProduction) {
      console.error(`❌ ${operationName} operation failed: WhatsApp backend not connected and demo mode is disabled in production`);
      
      // In production, provide graceful degradation instead of hard failure
      const gracefulResponse = {
        success: false,
        error: 'WhatsApp backend not available',
        message: `${operationName} operation requires WhatsApp backend connection`,
        fallback: true,
        suggestion: 'Please check WhatsApp backend service status'
      };
      
      // For certain operations, we can provide graceful fallbacks
      if (operationName === 'logout' || operationName === 'disconnect') {
        console.warn(`⚠️ ${operationName} operation completed locally (backend unavailable)`);
        return Promise.resolve({
          success: true,
          message: `${operationName} completed locally`,
          fallback: true
        });
      }
      
      // For other operations, return the graceful error
      return Promise.resolve(gracefulResponse);
    }
    
    console.warn(`🎭 Demo mode: ${operationName} operation simulated (backend not available)`);
    
    // Return appropriate demo data based on operation type
    const demoResponses: Record<string, any> = {
      logout: { success: true, message: 'Demo logout completed' },
      disconnect: { success: true, message: 'Demo disconnect completed' },
      sendMessage: { success: true, messageId: `demo_${Date.now()}`, message: 'Demo message sent' },
      generateQRCode: { 
        success: true, 
        qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyI+REVNTYBBR1I8L3RleHQ+PC9zdmc+',
        sessionId: `demo_session_${Date.now()}`,
        message: 'Demo QR Code generated',
        demo: true
      },
      getContacts: [],
      getMessages: [],
      getSettings: {
        auto_reply_enabled: false,
        auto_reply_message: 'Demo mode - auto reply disabled',
        business_hours_enabled: false,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        welcome_message_enabled: false,
        welcome_message: 'Demo mode welcome message',
        session_timeout: 300
      }
    };
    
    const response = demoResponses[operationName] || {
      success: true,
      message: `Demo mode: ${operationName} operation simulated successfully`,
      demo: true
    };
    
    return Promise.resolve(response);
  }

  // Enhanced event listener setup with better error handling
  private setupEventListeners(): void {
    if (!this.socket) {
      console.error('❌ Cannot setup event listeners: socket not initialized');
      return;
    }

    console.log('🔧 Setting up enhanced WhatsApp socket event listeners...');

    // Connection events with enhanced logging
    this.socket.on('connect', () => {
      console.log('✅ Socket connected to WhatsApp backend');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      this.notifyStatusCallbacks({
        isConnected: true,
        status: 'connected',
        message: 'Connected to WhatsApp backend',
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected from WhatsApp backend:', reason);
      this.isConnected = false;
      this.isGeneratingQR = false;
      this.currentQRCode = null;
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'disconnected',
        message: `Disconnected from backend: ${reason}`,
        timestamp: new Date().toISOString()
      });

      // Auto-reconnect logic with exponential backoff
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
      this.isGeneratingQR = false;
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'connection_error',
        message: `Connection error: ${error.message}`,
        timestamp: new Date().toISOString()
      });

      this.handleReconnection();
    });

    // WhatsApp specific events with enhanced error handling
    this.socket.on('whatsapp:qr', (data: any) => {
      console.log('📱 QR code event received:', data);
      
      try {
        if (data && data.qr) {
          console.log('✅ Valid QR code received, length:', data.qr.length);
          this.currentQRCode = data.qr;
          this.notifyQRCodeCallbacks(data.qr);
          
          this.notifyStatusCallbacks({
            isConnected: false,
            status: 'qr_received',
            message: 'QR code generated successfully. Please scan with your mobile device.',
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ Invalid QR code data:', data);
          this.notifyStatusCallbacks({
            isConnected: false,
            status: 'error',
            message: 'Invalid QR code received from backend',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error: any) {
        console.error('❌ Error processing QR code:', error);
        this.notifyStatusCallbacks({
          isConnected: false,
          status: 'error',
          message: `Error processing QR code: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on('whatsapp:status', (status: any) => {
      console.log('📊 WhatsApp status update:', status);
      
      try {
        // Validate status data
        if (!status || typeof status !== 'object') {
          console.error('❌ Invalid status data received:', status);
          return;
        }

        const whatsappStatus: WhatsAppStatus = {
          isConnected: Boolean(status.isConnected),
          status: status.status || 'unknown',
          message: status.message || '',
          phoneNumber: status.phoneNumber,
          timestamp: status.timestamp || new Date().toISOString()
        };

        this.notifyStatusCallbacks(whatsappStatus);
        
        // Update internal state
        if (whatsappStatus.isConnected) {
          this.isGeneratingQR = false;
          this.currentQRCode = null;
        }
        
      } catch (error: any) {
        console.error('❌ Error processing status update:', error);
        this.notifyStatusCallbacks({
          isConnected: false,
          status: 'error',
          message: `Error processing status: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on('whatsapp:message', (message: any) => {
      console.log('📨 WhatsApp message received:', message);
      
      try {
        // Validate message data
        if (!message || !message.id || !message.from || !message.body) {
          console.error('❌ Invalid message data:', message);
          return;
        }

        const whatsappMessage: WhatsAppMessage = {
          id: message.id,
          from: message.from,
          to: message.to || '',
          body: message.body,
          timestamp: message.timestamp || new Date().toISOString(),
          type: message.type || 'text',
          contact: message.contact
        };

        this.notifyMessageCallbacks(whatsappMessage);
        
      } catch (error: any) {
        console.error('❌ Error processing message:', error);
      }
    });

    this.socket.on('whatsapp:receipt', (receipt: any) => {
      console.log('📧 Message receipt received:', receipt);
      // Handle message receipts if needed
    });

    this.socket.on('whatsapp:ready', (data: any) => {
      console.log('✅ WhatsApp client ready:', data);
      
      this.notifyStatusCallbacks({
        isConnected: true,
        status: 'ready',
        message: 'WhatsApp client is ready',
        phoneNumber: data.phoneNumber,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('whatsapp:authenticated', (data: any) => {
      console.log('🔐 WhatsApp authenticated:', data);
      
      this.notifyStatusCallbacks({
        isConnected: true,
        status: 'authenticated',
        message: 'WhatsApp authentication successful',
        phoneNumber: data.phoneNumber,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('whatsapp:auth_failure', (error: any) => {
      console.error('🔐❌ WhatsApp authentication failed:', error);
      this.isGeneratingQR = false;
      this.currentQRCode = null;
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'auth_failure',
        message: `Authentication failed: ${error.message || 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('whatsapp:disconnected', (reason: any) => {
      console.log('📱🔌 WhatsApp client disconnected:', reason);
      this.isGeneratingQR = false;
      this.currentQRCode = null;
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'disconnected',
        message: `WhatsApp disconnected: ${reason.message || reason}`,
        timestamp: new Date().toISOString()
      });
    });

    // Generic error handler
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'error',
        message: `Socket error: ${error.message || error}`,
        timestamp: new Date().toISOString()
      });
    });

    // WhatsApp specific error handler
    this.socket.on('whatsapp:error', (error: any) => {
      console.error('❌ WhatsApp error:', error);
      this.isGeneratingQR = false;
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'error',
        message: `WhatsApp error: ${error.message || error}`,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Enhanced WhatsApp socket event listeners setup complete');
  }

  // Enhanced reconnection logic with exponential backoff
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'connection_failed',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    this.notifyStatusCallbacks({
      isConnected: false,
      status: 'reconnecting',
      message: `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.log('🔄 Attempting to reconnect socket...');
        this.socket.connect();
      }
    }, delay);
  }

  // Enhanced initialization with better error handling
  async initializeWhatsApp(): Promise<void> {
    console.log('🚀 Initializing WhatsApp connection...');
    
    try {
      if (!this.socket) {
        throw new Error('Socket not initialized. Please check backend connection.');
      }

      if (!this.socket.connected) {
        console.log('🔌 Socket not connected, attempting to connect...');
        
        // Wait for connection with timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout after 10 seconds'));
          }, 10000);

          this.socket!.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.socket!.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });

          this.socket!.connect();
        });
      }

      // Check WhatsApp backend health
      const healthCheck = await this.checkBackendHealth();
      if (!healthCheck.healthy) {
        throw new Error(`Backend health check failed: ${healthCheck.error}`);
      }

      console.log('✅ WhatsApp initialization completed successfully');
      
      this.notifyStatusCallbacks({
        isConnected: this.socket.connected,
        status: 'initialized',
        message: 'WhatsApp service initialized successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ WhatsApp initialization failed:', error);
      
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'initialization_failed',
        message: `Initialization failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Backend health check
  async checkBackendHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      if (!this.socket || !this.socket.connected) {
        return { healthy: false, error: 'Socket not connected' };
      }

      // Emit health check and wait for response
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ healthy: false, error: 'Health check timeout' });
        }, 5000);

        this.socket!.once('whatsapp:health_response', (response: any) => {
          clearTimeout(timeout);
          resolve({ healthy: response.healthy, error: response.error });
        });

        this.socket!.emit('whatsapp:health_check', {
          timestamp: new Date().toISOString()
        });
      });
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }

  // Enhanced status getter with validation
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      if (!this.socket) {
        return {
          isConnected: false,
          status: 'not_initialized',
          message: 'Socket not initialized',
          timestamp: new Date().toISOString()
        };
      }

      if (!this.socket.connected) {
        return {
          isConnected: false,
          status: 'disconnected',
          message: 'Socket not connected to backend',
          timestamp: new Date().toISOString()
        };
      }

      // Request current status from backend
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            isConnected: false,
            status: 'timeout',
            message: 'Status request timeout',
            timestamp: new Date().toISOString()
          });
        }, 5000);

        this.socket!.once('whatsapp:status_response', (status: any) => {
          clearTimeout(timeout);
          resolve({
            isConnected: Boolean(status.isConnected),
            status: status.status || 'unknown',
            message: status.message || '',
            phoneNumber: status.phoneNumber,
            timestamp: status.timestamp || new Date().toISOString()
          });
        });

        this.socket!.emit('whatsapp:get_status', {
          timestamp: new Date().toISOString()
        });
      });
    } catch (error: any) {
      console.error('❌ Error getting status:', error);
      return {
        isConnected: false,
        status: 'error',
        message: `Error getting status: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Check if socket is connected
  isSocketConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  // Enhanced logout with proper cleanup
  async logout(): Promise<void> {
    console.log('🔄 Logging out from WhatsApp...');
    
    try {
      // Reset internal state
      this.isGeneratingQR = false;
      this.currentQRCode = null;
      
      if (this.socket && this.socket.connected) {
        // Emit logout event to backend
        this.socket.emit('whatsapp:logout', {
          timestamp: new Date().toISOString()
        });
        
        // Wait a bit for the logout to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Notify status change
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'logged_out',
        message: 'Successfully logged out from WhatsApp',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ WhatsApp logout completed');
      
    } catch (error: any) {
      console.error('❌ Error during logout:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.socket || !this.isConnected) {
      return;
    }

    return new Promise((resolve) => {
      this.socket!.emit('whatsapp:disconnect', {}, (response: any) => {
        console.log('WhatsApp disconnected:', response);
        resolve();
      });
    });
  }

  // Event listeners
  onStatusChange(callback: (status: WhatsAppStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  onQRCode(callback: (qrCode: string) => void): void {
    console.log('📝 Registering QR code callback...');
    console.log('📝 Current number of QR code callbacks:', this.qrCodeCallbacks.length);
    this.qrCodeCallbacks.push(callback);
    console.log('📝 QR code callback registered. Total callbacks:', this.qrCodeCallbacks.length);
  }

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onConnection(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  // Remove event listeners
  removeStatusListener(callback: (status: WhatsAppStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  removeQRCodeListener(callback: (qrCode: string) => void): void {
    const index = this.qrCodeCallbacks.indexOf(callback);
    if (index > -1) {
      this.qrCodeCallbacks.splice(index, 1);
    }
  }

  removeMessageListener(callback: (message: WhatsAppMessage) => void): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  removeConnectionListener(callback: (connected: boolean) => void): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  // Private notification methods
  private notifyStatusCallbacks(status: WhatsAppStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  private notifyQRCodeCallbacks(qrCode: string): void {
    console.log('🔔 Notifying QR code callbacks...');
    console.log('🔔 Number of QR code callbacks registered:', this.qrCodeCallbacks.length);
    console.log('🔔 QR code to notify:', qrCode?.substring(0, 50) + '...');
    
    this.qrCodeCallbacks.forEach((callback, index) => {
      try {
        console.log(`🔔 Calling QR code callback ${index + 1}/${this.qrCodeCallbacks.length}`);
        callback(qrCode);
        console.log(`✅ QR code callback ${index + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Error in QR code callback ${index + 1}:`, error);
      }
    });
    
    console.log('🔔 All QR code callbacks notified');
  }

  private notifyMessageCallbacks(message: WhatsAppMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  // Utility methods
  reconnect(): void {
    console.log('🔄 Manual reconnection requested...');
    
    // Clear any existing timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Reset reconnection attempts for manual reconnect
    this.reconnectAttempts = 0;
    
    // Reinitialize socket connection
    this.initializeSocket();
  }

  // Cleanup
  destroy(): void {
    console.log('🧹 Destroying WhatsApp Socket Service...');
    
    // Clear all timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Disconnect and cleanup socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear all callbacks
    this.statusCallbacks = [];
    this.qrCodeCallbacks = [];
    this.messageCallbacks = [];
    this.connectionCallbacks = [];
    
    // Reset state
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    console.log('✅ WhatsApp Socket Service destroyed');
  }

  // Enhanced QR code generation with comprehensive error handling
  async generateQRCode(): Promise<void> {
    console.log('🔄 Starting enhanced QR code generation...');
    
    try {
      // Validate socket connection first
      if (!this.socket) {
        console.error('❌ Socket not initialized');
        throw new Error('Socket connection not initialized. Please check backend connection.');
      }

      if (!this.socket.connected) {
        console.error('❌ Socket not connected');
        throw new Error('Socket not connected to backend. Please check server status.');
      }

      // Check if already generating QR code
      if (this.isGeneratingQR) {
        console.warn('⚠️ QR code generation already in progress');
        throw new Error('QR code generation already in progress. Please wait.');
      }

      this.isGeneratingQR = true;
      
      // Clear any existing QR code
      this.currentQRCode = null;
      
      // Notify status change to loading
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'generating_qr',
        message: 'Generating QR code...',
        timestamp: new Date().toISOString()
      });

      console.log('📡 Emitting whatsapp:generate_qr event...');
      
      // Create a promise that resolves when QR code is received or rejects on timeout
      const qrPromise = new Promise<void>((resolve, reject) => {
        // Set up timeout (15 seconds)
        const timeoutId = setTimeout(() => {
          console.error('⏰ QR code generation timeout after 15 seconds');
          this.isGeneratingQR = false;
          
          this.notifyStatusCallbacks({
            isConnected: false,
            status: 'error',
            message: 'QR code generation timeout. Please try again.',
            timestamp: new Date().toISOString()
          });
          
          reject(new Error('QR code generation timeout after 15 seconds'));
        }, 15000);

        // Set up success handler
        const successHandler = () => {
          clearTimeout(timeoutId);
          this.isGeneratingQR = false;
          console.log('✅ QR code generation completed successfully');
          resolve();
        };

        // Set up error handler
        const errorHandler = (error: any) => {
          clearTimeout(timeoutId);
          this.isGeneratingQR = false;
          console.error('❌ QR code generation failed:', error);
          
          this.notifyStatusCallbacks({
            isConnected: false,
            status: 'error',
            message: error.message || 'QR code generation failed',
            timestamp: new Date().toISOString()
          });
          
          reject(new Error(error.message || 'QR code generation failed'));
        };

        // Listen for QR code response (one-time listener)
        this.socket!.once('whatsapp:qr', (data: any) => {
          console.log('📱 QR code received from backend:', data);
          
          if (data && data.qr) {
            // Validate QR code data
            const validation = this.validateQRCodeData(data.qr);
            if (!validation.valid) {
              errorHandler(new Error(`Invalid QR code: ${validation.error}`));
              return;
            }
            
            this.currentQRCode = data.qr;
            this.notifyQRCodeCallbacks(data.qr);
            successHandler();
          } else {
            errorHandler(new Error('Invalid QR code data received from backend'));
          }
        });

        // Listen for error response (one-time listener)
        this.socket!.once('whatsapp:error', (error: any) => {
          console.error('❌ Backend error during QR generation:', error);
          errorHandler(error);
        });

        // Emit the generate QR request
        this.socket!.emit('whatsapp:generate_qr', {
          timestamp: new Date().toISOString(),
          clientId: this.clientId
        });
      });

      // Wait for QR code generation to complete
      await qrPromise;
      
    } catch (error: any) {
      console.error('❌ QR code generation error:', error);
      this.isGeneratingQR = false;
      
      // Notify error to callbacks
      this.notifyStatusCallbacks({
        isConnected: false,
        status: 'error',
        message: error.message || 'Failed to generate QR code',
        timestamp: new Date().toISOString()
      });
      
      // Re-throw error for caller to handle
      throw error;
    }
  }

  // Validate QR code data format and size
  private validateQRCodeData(qrData: string): { valid: boolean; error?: string } {
    try {
      if (!qrData || typeof qrData !== 'string') {
        return { valid: false, error: 'QR code data is empty or invalid type' };
      }

      // Check if it's a data URL
      if (!qrData.startsWith('data:image/')) {
        return { valid: false, error: 'QR code data is not a valid image data URL' };
      }

      // Check size (should be reasonable for QR code)
      const sizeInBytes = qrData.length;
      const maxSize = 1024 * 1024; // 1MB max
      const minSize = 1000; // 1KB min

      if (sizeInBytes > maxSize) {
        return { valid: false, error: `QR code data too large: ${sizeInBytes} bytes (max: ${maxSize})` };
      }

      if (sizeInBytes < minSize) {
        return { valid: false, error: `QR code data too small: ${sizeInBytes} bytes (min: ${minSize})` };
      }

      // Check if it contains base64 data
      const base64Part = qrData.split(',')[1];
      if (!base64Part) {
        return { valid: false, error: 'QR code data URL missing base64 content' };
      }

      // Basic base64 validation
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Part)) {
        return { valid: false, error: 'QR code data contains invalid base64 content' };
      }

      console.log('✅ QR code data validation passed:', {
        size: sizeInBytes,
        format: qrData.substring(0, 30) + '...'
      });

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `QR code validation error: ${error.message}` };
    }
  }

  // Get connection statistics
  getConnectionStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    isGeneratingQR: boolean;
    hasQRCode: boolean;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isGeneratingQR: this.isGeneratingQR,
      hasQRCode: this.currentQRCode !== null
    };
  }

  // Force reconnection
  async forceReconnect(): Promise<void> {
    console.log('🔄 Forcing socket reconnection...');
    
    try {
      if (this.socket) {
        this.socket.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.socket.connect();
      }
    } catch (error: any) {
      console.error('❌ Force reconnect error:', error);
      throw error;
    }
  }

  // Clean up resources
  cleanup(): void {
    console.log('🧹 Cleaning up WhatsApp socket service...');
    
    try {
      // Reset state
      this.isGeneratingQR = false;
      this.currentQRCode = null;
      this.reconnectAttempts = 0;
      
      // Clear callbacks
      this.qrCodeCallbacks.clear();
      this.statusCallbacks.clear();
      this.messageCallbacks.clear();
      this.connectionCallbacks.clear();
      
      // Disconnect socket
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isConnected = false;
      
      console.log('✅ WhatsApp socket service cleanup completed');
    } catch (error: any) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

// Create and export singleton instance
const whatsappSocketService = new WhatsAppSocketService();
export default whatsappSocketService;