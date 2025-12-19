import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, MessageCircle, Bell, Activity, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import whatsappSocketService, { WhatsAppStatus, WhatsAppMessage } from '../../services/whatsapp-socket.service';

interface ConnectionStatus {
  isConnected: boolean;
  phoneNumber?: string;
  clientName?: string;
  lastSeen?: string;
  qrCode?: string;
  isInitializing?: boolean;
  contactsCount?: number;
  error?: string;
  lastError?: string;
  connectionAttempts?: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: string;
  isGroup: boolean;
}

interface ActivityLog {
  id: string;
  type: 'connection' | 'message' | 'command' | 'error' | 'warning' | 'success';
  description: string;
  timestamp: string;
  details?: any;
}

export default function WhatsAppMobilePage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isInitializing: false,
    connectionAttempts: 0
  });
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrGenerationTimeout, setQrGenerationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [maxRetryAttempts] = useState(3);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date>(new Date());
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    commandsProcessed: 0,
    uptime: '00:00:00'
  });

  // Health check for backend
  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const isHealthy = whatsappSocketService.isSocketConnected();
      setBackendHealthy(isHealthy);
      setLastHealthCheck(new Date());
      
      if (!isHealthy) {
        addActivityLog('warning', 'Backend WhatsApp service tidak tersedia', { 
          timestamp: new Date().toISOString(),
          socketConnected: isHealthy
        });
      }
      
      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      setBackendHealthy(false);
      setLastHealthCheck(new Date());
      return false;
    }
  };

  // Enhanced QR code generation with timeout and retry logic
  const handleGenerateQR = async () => {
    try {
      // Cancel any existing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Clear any existing timeout
      if (qrGenerationTimeout) {
        clearTimeout(qrGenerationTimeout);
        setQrGenerationTimeout(null);
      }

      setIsLoading(true);
      setConnectionStatus(prev => ({ 
        ...prev, 
        isInitializing: true, 
        qrCode: undefined, 
        error: undefined,
        connectionAttempts: (prev.connectionAttempts || 0) + 1
      }));
      
      addNotification('Memulai generasi QR Code WhatsApp...');
      addActivityLog('connection', 'Memulai generasi QR Code WhatsApp', {
        attempt: connectionStatus.connectionAttempts || 0,
        retryAttempts: retryAttempts
      });

      // Check backend health first
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        throw new Error('Backend WhatsApp service tidak tersedia. Silakan periksa koneksi server.');
      }

      // Set timeout for QR generation (15 seconds)
      const timeoutId = setTimeout(() => {
        if (!abortControllerRef.current?.signal.aborted) {
          handleQRGenerationTimeout();
        }
      }, 15000);
      setQrGenerationTimeout(timeoutId);

      // Generate QR code using the real WhatsApp service
      await whatsappSocketService.generateQRCode();
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      setQrGenerationTimeout(null);
      setRetryAttempts(0); // Reset retry attempts on success
      
      addActivityLog('success', 'QR Code generation berhasil dimulai', {});
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      
      // Clear timeout
      if (qrGenerationTimeout) {
        clearTimeout(qrGenerationTimeout);
        setQrGenerationTimeout(null);
      }
      
      const errorMessage = error.message || 'Gagal generate QR Code';
      
      setConnectionStatus(prev => ({ 
        ...prev, 
        isInitializing: false, 
        error: errorMessage,
        lastError: errorMessage
      }));
      
      addNotification(`Error: ${errorMessage}`);
      addActivityLog('error', 'Gagal generate QR Code', { 
        error: errorMessage,
        attempt: connectionStatus.connectionAttempts || 0,
        retryAttempts: retryAttempts
      });
      
      setIsLoading(false);
      
      // Auto-retry logic with exponential backoff
      if (retryAttempts < maxRetryAttempts && !error.message?.includes('Backend WhatsApp service tidak tersedia')) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryAttempts), 10000); // Max 10 seconds
        setRetryAttempts(prev => prev + 1);
        
        addNotification(`Mencoba lagi dalam ${retryDelay / 1000} detik... (${retryAttempts + 1}/${maxRetryAttempts})`);
        addActivityLog('warning', `Auto-retry dalam ${retryDelay / 1000} detik`, {
          retryAttempt: retryAttempts + 1,
          maxRetries: maxRetryAttempts,
          delay: retryDelay
        });
        
        setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            handleGenerateQR();
          }
        }, retryDelay);
      }
    }
  };

  // Handle QR generation timeout
  const handleQRGenerationTimeout = () => {
    console.error('QR code generation timeout after 15 seconds');
    
    setConnectionStatus(prev => ({ 
      ...prev, 
      isInitializing: false, 
      error: 'Timeout: QR code generation melebihi batas waktu (15 detik)',
      lastError: 'QR generation timeout'
    }));
    
    setIsLoading(false);
    
    addNotification('Timeout: QR code generation melebihi batas waktu. Silakan coba lagi.');
    addActivityLog('error', 'QR code generation timeout setelah 15 detik', {
      timeout: 15000,
      attempt: connectionStatus.connectionAttempts || 0
    });
    
    // Auto-retry on timeout if attempts remaining
    if (retryAttempts < maxRetryAttempts) {
      const retryDelay = Math.min(2000 * Math.pow(2, retryAttempts), 10000);
      setRetryAttempts(prev => prev + 1);
      
      addNotification(`Timeout - mencoba lagi dalam ${retryDelay / 1000} detik...`);
      addActivityLog('warning', `Auto-retry setelah timeout dalam ${retryDelay / 1000} detik`, {
        retryAttempt: retryAttempts + 1,
        reason: 'timeout'
      });
      
      setTimeout(() => {
        if (!abortControllerRef.current?.signal.aborted) {
          handleGenerateQR();
        }
      }, retryDelay);
    }
  };

  // Handle disconnect with proper cleanup
  const handleDisconnect = async () => {
    try {
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear timeouts
      if (qrGenerationTimeout) {
        clearTimeout(qrGenerationTimeout);
        setQrGenerationTimeout(null);
      }
      
      setIsLoading(true);
      await whatsappSocketService.logout();
      
      // Reset states
      setConnectionStatus({
        isConnected: false,
        isInitializing: false,
        connectionAttempts: 0
      });
      setRetryAttempts(0);
      setRecentMessages([]);
      
      addNotification('WhatsApp mobile berhasil terputus');
      addActivityLog('connection', 'WhatsApp mobile terputus', {});
      
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      addNotification(`Gagal memutus koneksi: ${error.message}`);
      addActivityLog('error', 'Gagal memutus koneksi WhatsApp', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual retry function
  const handleManualRetry = () => {
    setRetryAttempts(0);
    setConnectionStatus(prev => ({ ...prev, error: undefined, lastError: undefined }));
    handleGenerateQR();
  };

  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
  };

  const addActivityLog = (type: ActivityLog['type'], description: string, details: any) => {
    const log: ActivityLog = {
      id: Date.now().toString(),
      type,
      description,
      timestamp: new Date().toISOString(),
      details
    };
    
    setActivityLogs(prev => [log, ...prev.slice(0, 19)]);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('id-ID');
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'connection': return <Wifi className="w-4 h-4" />;
      case 'message': return <MessageCircle className="w-4 h-4" />;
      case 'command': return <Activity className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Setup WhatsApp event listeners with enhanced error handling
  useEffect(() => {
    console.log('🔧 Setting up WhatsApp event listeners...');

    // Listen for QR code with timeout handling
    const handleQRCode = (qrCode: string) => {
      console.log('📱 QR Code received:', qrCode);
      
      // Clear timeout since we received QR code
      if (qrGenerationTimeout) {
        clearTimeout(qrGenerationTimeout);
        setQrGenerationTimeout(null);
      }
      
      setConnectionStatus(prev => ({
        ...prev,
        qrCode: qrCode,
        isInitializing: true,
        error: undefined
      }));
      setIsLoading(false);
      setRetryAttempts(0); // Reset retry attempts on success
      
      addNotification('QR Code berhasil di-generate. Scan dengan WhatsApp mobile Anda.');
      addActivityLog('success', 'QR Code generated untuk koneksi mobile', {
        qrCodeLength: qrCode.length,
        qrCodeType: qrCode.startsWith('data:image') ? 'data-url' : 'string'
      });
    };

    // Listen for status changes with enhanced error handling
    const handleStatusChange = (status: WhatsAppStatus) => {
      console.log('📊 WhatsApp status changed:', status);
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: status.isConnected,
        phoneNumber: status.phoneNumber,
        lastSeen: status.timestamp,
        isInitializing: status.status === 'connecting' || status.status === 'initializing'
      }));

      if (status.isConnected) {
        // Clear timeouts and reset states on successful connection
        if (qrGenerationTimeout) {
          clearTimeout(qrGenerationTimeout);
          setQrGenerationTimeout(null);
        }
        
        setIsLoading(false);
        setRetryAttempts(0);
        
        addNotification('WhatsApp mobile berhasil terhubung!');
        addActivityLog('success', `WhatsApp mobile terhubung: ${status.phoneNumber}`, status);
        
        // Load contacts count
        whatsappSocketService.getContacts().then(contacts => {
          setConnectionStatus(prev => ({ ...prev, contactsCount: contacts.length }));
        }).catch(error => {
          console.error('Failed to load contacts:', error);
          addActivityLog('warning', 'Gagal memuat daftar kontak', { error: error.message });
        });
        
      } else if (status.status === 'disconnected') {
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          isInitializing: false,
          qrCode: undefined,
          phoneNumber: undefined,
          contactsCount: 0
        }));
        setRecentMessages([]);
        setIsLoading(false);
        
        if (status.message && !status.message.includes('Disconnected from backend')) {
          addActivityLog('warning', `WhatsApp terputus: ${status.message}`, status);
        }
        
      } else if (status.status === 'error') {
        setConnectionStatus(prev => ({
          ...prev,
          error: status.message,
          lastError: status.message,
          isInitializing: false
        }));
        setIsLoading(false);
        
        addNotification(`Error: ${status.message}`);
        addActivityLog('error', `WhatsApp error: ${status.message}`, status);
      }
    };

    // Listen for messages with error handling
    const handleMessage = (message: WhatsAppMessage) => {
      console.log('📨 New message received:', message);
      
      try {
        const newMessage: Message = {
          id: message.id,
          from: message.from,
          to: message.to,
          body: message.body,
          timestamp: new Date(message.timestamp).getTime() / 1000,
          type: message.type,
          isGroup: false
        };

        setRecentMessages(prev => [newMessage, ...prev.slice(0, 9)]);
        setStats(prev => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }));
        
        const senderName = message.contact?.name || message.from;
        addNotification(`Pesan baru dari ${senderName}`);
        addActivityLog('message', `Pesan diterima dari ${message.from}`, message);
        
      } catch (error: any) {
        console.error('Error processing message:', error);
        addActivityLog('error', 'Gagal memproses pesan masuk', { error: error.message, message });
      }
    };

    // Register event listeners
    whatsappSocketService.onQRCode(handleQRCode);
    whatsappSocketService.onStatusChange(handleStatusChange);
    whatsappSocketService.onMessage(handleMessage);

    // Initial status check with error handling
    whatsappSocketService.getStatus()
      .then(status => {
        handleStatusChange(status);
        addActivityLog('connection', 'Status WhatsApp dimuat', status);
      })
      .catch(error => {
        console.error('Failed to get initial status:', error);
        addActivityLog('error', 'Gagal memuat status awal WhatsApp', { error: error.message });
        setBackendHealthy(false);
      });

    // Periodic health check
    const healthCheckInterval = setInterval(checkBackendHealth, 30000); // Every 30 seconds

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WhatsApp event listeners...');
      
      // Cancel any ongoing operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear timeouts
      if (qrGenerationTimeout) {
        clearTimeout(qrGenerationTimeout);
      }
      
      clearInterval(healthCheckInterval);
      
      whatsappSocketService.removeQRCodeListener(handleQRCode);
      whatsappSocketService.removeStatusListener(handleStatusChange);
      whatsappSocketService.removeMessageListener(handleMessage);
    };
  }, []);

  // Update uptime
  useEffect(() => {
    if (connectionStatus.isConnected && connectionStatus.lastSeen) {
      const interval = setInterval(() => {
        const startTime = new Date(connectionStatus.lastSeen!);
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setStats(prev => ({
          ...prev,
          uptime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus.isConnected, connectionStatus.lastSeen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Mobile Connection</h1>
          <p className="text-muted-foreground">
            Hubungkan aplikasi dengan WhatsApp mobile Anda untuk monitoring dan kontrol remote
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus.isConnected ? "default" : "secondary"}>
            {connectionStatus.isConnected ? (
              <>
                <Wifi className="w-4 h-4 mr-1" />
                Terhubung
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-1" />
                Terputus
              </>
            )}
          </Badge>
          <Badge variant={backendHealthy ? "default" : "destructive"}>
            {backendHealthy ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Backend OK
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1" />
                Backend Error
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Error Alert */}
      {connectionStatus.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{connectionStatus.error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRetry}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Backend Health Warning */}
      {!backendHealthy && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Backend WhatsApp service tidak tersedia. Terakhir dicek: {lastHealthCheck.toLocaleTimeString('id-ID')}
            <br />
            <small>Silakan periksa koneksi server atau hubungi administrator.</small>
          </AlertDescription>
        </Alert>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <Alert key={index}>
              <Bell className="h-4 w-4" />
              <AlertDescription>{notification}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pesan Masuk</p>
                <p className="text-2xl font-bold">{stats.messagesReceived}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pesan Keluar</p>
                <p className="text-2xl font-bold">{stats.messagesSent}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kontak</p>
                <p className="text-2xl font-bold">{connectionStatus.contactsCount || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{stats.uptime}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Status Koneksi
            </CardTitle>
            <CardDescription>
              Status koneksi WhatsApp mobile Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionStatus.isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nomor WhatsApp:</span>
                  <span className="text-sm">{connectionStatus.phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nama:</span>
                  <span className="text-sm">{connectionStatus.clientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Terakhir aktif:</span>
                  <span className="text-sm">
                    {connectionStatus.lastSeen ? new Date(connectionStatus.lastSeen).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Percobaan koneksi:</span>
                  <span className="text-sm">{connectionStatus.connectionAttempts || 0}</span>
                </div>
                <Button 
                  onClick={handleDisconnect} 
                  variant="outline" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <WifiOff className="w-4 h-4 mr-2" />
                  )}
                  Disconnect WhatsApp Mobile
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  WhatsApp mobile belum terhubung. Klik tombol di bawah untuk memulai koneksi.
                </p>
                {connectionStatus.connectionAttempts && connectionStatus.connectionAttempts > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Percobaan koneksi: {connectionStatus.connectionAttempts}
                    {retryAttempts > 0 && ` | Retry: ${retryAttempts}/${maxRetryAttempts}`}
                  </div>
                )}
                <Button 
                  onClick={handleGenerateQR} 
                  className="w-full"
                  disabled={isLoading || connectionStatus.isInitializing}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4 mr-2" />
                  )}
                  {connectionStatus.isInitializing ? 'Generating...' : 'Generate QR Code'}
                </Button>
                {connectionStatus.error && (
                  <Button 
                    onClick={handleManualRetry} 
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Coba Lagi
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan QR code ini dengan WhatsApp mobile Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionStatus.qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img 
                    src={connectionStatus.qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64 border rounded-lg"
                    onError={(e) => {
                      console.error('QR Code image failed to load');
                      addActivityLog('error', 'QR Code image gagal dimuat', {
                        src: connectionStatus.qrCode?.substring(0, 50) + '...'
                      });
                    }}
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Cara menghubungkan:</p>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Buka WhatsApp di ponsel Anda</li>
                    <li>2. Tap Menu (⋮) → WhatsApp Web</li>
                    <li>3. Scan QR code di atas</li>
                    <li>4. Tunggu hingga terhubung</li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 QR Code akan expired dalam 20 detik. Jika tidak berhasil, generate ulang QR Code.
                    </p>
                  </div>
                </div>
              </div>
            ) : connectionStatus.isConnected ? (
              <div className="text-center py-8">
                <Wifi className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium text-green-600">WhatsApp Mobile Terhubung!</p>
                <p className="text-sm text-muted-foreground">
                  Anda dapat menggunakan WhatsApp mobile untuk berinteraksi dengan aplikasi
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Klik "Generate QR Code" untuk memulai koneksi
                </p>
                {connectionStatus.error && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ {connectionStatus.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Pesan Terbaru
            </CardTitle>
            <CardDescription>
              10 pesan terakhir yang diterima melalui WhatsApp mobile
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMessages.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{message.from}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.body}</p>
                    {message.body.startsWith('/') && (
                      <Badge variant="secondary" className="mt-2">
                        Command
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada pesan. Pesan akan muncul di sini setelah WhatsApp mobile terhubung.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Log Aktivitas
            </CardTitle>
            <CardDescription>
              Riwayat aktivitas sistem WhatsApp mobile
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 border rounded">
                    <div className={`p-1 rounded ${
                      log.type === 'error' ? 'bg-red-100 text-red-600' :
                      log.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      log.type === 'success' ? 'bg-green-100 text-green-600' :
                      log.type === 'connection' ? 'bg-blue-100 text-blue-600' :
                      log.type === 'message' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getActivityIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Detail
                          </summary>
                          <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Log aktivitas akan muncul di sini
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Command Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Panduan Perintah WhatsApp Mobile
          </CardTitle>
          <CardDescription>
            Perintah yang dapat Anda gunakan melalui WhatsApp mobile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Perintah Anggota:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/saldo</code>
                  <span className="text-sm text-muted-foreground">Cek saldo simpanan</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/pinjaman</code>
                  <span className="text-sm text-muted-foreground">Cek status pinjaman</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/riwayat</code>
                  <span className="text-sm text-muted-foreground">Lihat riwayat transaksi</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/info</code>
                  <span className="text-sm text-muted-foreground">Informasi akun</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Perintah Admin:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/status</code>
                  <span className="text-sm text-muted-foreground">Status sistem</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/laporan</code>
                  <span className="text-sm text-muted-foreground">Generate laporan</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/backup</code>
                  <span className="text-sm text-muted-foreground">Backup database</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">/help</code>
                  <span className="text-sm text-muted-foreground">Bantuan lengkap</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">💡 Tips Penggunaan:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Kirim perintah langsung ke nomor bot WhatsApp</li>
              <li>• Gunakan huruf kecil untuk semua perintah</li>
              <li>• Bot akan merespons otomatis dengan data real-time</li>
              <li>• Untuk bantuan lengkap, kirim perintah "/help"</li>
            </ul>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">⚠️ Troubleshooting:</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Jika QR Code tidak muncul, periksa koneksi internet</li>
              <li>• Jika timeout, coba generate ulang QR Code</li>
              <li>• Pastikan WhatsApp mobile versi terbaru</li>
              <li>• Logout dari WhatsApp Web lain sebelum scan</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}