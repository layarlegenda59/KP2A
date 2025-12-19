import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, MessageCircle, Bell, Activity, Users, Send, CheckCircle } from 'lucide-react';

interface ConnectionStatus {
  isConnected: boolean;
  phoneNumber?: string;
  clientName?: string;
  lastSeen?: string;
  qrCode?: string;
  isInitializing?: boolean;
  contactsCount?: number;
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
  type: 'connection' | 'message' | 'command' | 'error';
  description: string;
  timestamp: string;
  details?: any;
}

export default function WhatsAppMobileIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isInitializing: false
  });
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    commandsProcessed: 0,
    uptime: '00:00:00'
  });

  // Simulate QR code generation
  const handleGenerateQR = () => {
    setIsLoading(true);
    setConnectionStatus(prev => ({ ...prev, isInitializing: true }));
    
    // Simulate QR code generation
    setTimeout(() => {
      const qrCodeData = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <rect x="10" y="10" width="20" height="20" fill="black"/>
          <rect x="40" y="10" width="20" height="20" fill="black"/>
          <rect x="70" y="10" width="20" height="20" fill="black"/>
          <rect x="10" y="40" width="20" height="20" fill="black"/>
          <rect x="70" y="40" width="20" height="20" fill="black"/>
          <rect x="10" y="70" width="20" height="20" fill="black"/>
          <rect x="40" y="70" width="20" height="20" fill="black"/>
          <rect x="70" y="70" width="20" height="20" fill="black"/>
          <text x="100" y="100" font-family="Arial" font-size="12" fill="black">QR Code</text>
          <text x="100" y="120" font-family="Arial" font-size="10" fill="gray">Scan dengan WhatsApp</text>
        </svg>
      `);
      
      setConnectionStatus(prev => ({
        ...prev,
        qrCode: qrCodeData,
        isInitializing: true
      }));
      
      addNotification('QR Code berhasil di-generate. Scan dengan WhatsApp mobile Anda.');
      addActivityLog('connection', 'QR Code generated untuk koneksi mobile', {});
      setIsLoading(false);
    }, 2000);
  };

  // Simulate connection
  const handleConnect = () => {
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: true,
      isInitializing: false,
      phoneNumber: '+62 812-3456-7890',
      clientName: 'Admin KP2A',
      lastSeen: new Date().toISOString(),
      qrCode: undefined,
      contactsCount: 25
    }));
    
    addNotification('WhatsApp mobile berhasil terhubung!');
    addActivityLog('connection', 'WhatsApp mobile terhubung: +62 812-3456-7890', {});
    
    // Simulate some initial messages
    setTimeout(() => {
      const sampleMessages: Message[] = [
        {
          id: '1',
          from: '+62 812-1111-1111',
          to: '+62 812-3456-7890',
          body: '/status',
          timestamp: Date.now() / 1000,
          type: 'text',
          isGroup: false
        },
        {
          id: '2',
          from: '+62 812-2222-2222',
          to: '+62 812-3456-7890',
          body: '/saldo',
          timestamp: Date.now() / 1000 - 300,
          type: 'text',
          isGroup: false
        }
      ];
      
      setRecentMessages(sampleMessages);
      setStats(prev => ({ ...prev, messagesReceived: 2 }));
    }, 1000);
  };

  // Simulate disconnect
  const handleDisconnect = () => {
    setConnectionStatus({
      isConnected: false,
      isInitializing: false
    });
    setRecentMessages([]);
    addNotification('WhatsApp mobile terputus');
    addActivityLog('connection', 'WhatsApp mobile terputus', {});
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
      case 'error': return <WifiOff className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

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
          <h1 className="text-3xl font-bold">WhatsApp Mobile Integration</h1>
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
        </div>
      </div>

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
              <Send className="w-8 h-8 text-green-500" />
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
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-300">WhatsApp mobile siap digunakan</span>
                </div>
                <Button 
                  onClick={handleDisconnect} 
                  variant="outline" 
                  className="w-full"
                  disabled={isLoading}
                >
                  Disconnect WhatsApp Mobile
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  WhatsApp mobile belum terhubung. Klik tombol di bawah untuk memulai koneksi.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerateQR} 
                    className="flex-1"
                    disabled={isLoading || connectionStatus.isInitializing}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4 mr-2" />
                    )}
                    {connectionStatus.isInitializing ? 'Generating...' : 'Generate QR Code'}
                  </Button>
                  {connectionStatus.qrCode && (
                    <Button 
                      onClick={handleConnect} 
                      variant="outline"
                      title="Simulasi koneksi berhasil"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  )}
                </div>
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
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Cara menghubungkan:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>1. Buka WhatsApp di ponsel Anda</li>
                    <li>2. Tap Menu (⋮) → WhatsApp Web</li>
                    <li>3. Scan QR code di atas</li>
                    <li>4. Tunggu hingga terhubung</li>
                  </ol>
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
                      log.type === 'connection' ? 'bg-blue-100 text-blue-600' :
                      log.type === 'message' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getActivityIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </p>
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
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2">💡 Tips Penggunaan:</h5>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Kirim perintah langsung ke nomor bot WhatsApp</li>
              <li>• Gunakan huruf kecil untuk semua perintah</li>
              <li>• Bot akan merespons otomatis dengan data real-time</li>
              <li>• Untuk bantuan lengkap, kirim perintah "/help"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Panduan Integrasi
          </CardTitle>
          <CardDescription>
            Cara menggunakan WhatsApp mobile untuk mengakses aplikasi SIDARSIH
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-600">1. Koneksi</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Generate QR Code di dashboard</li>
                <li>• Scan dengan WhatsApp mobile</li>
                <li>• Tunggu konfirmasi koneksi</li>
                <li>• Status akan berubah menjadi "Terhubung"</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">2. Penggunaan</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Kirim perintah dengan format /command</li>
                <li>• Bot akan merespons otomatis</li>
                <li>• Data real-time dari database</li>
                <li>• Notifikasi penting otomatis</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-orange-600">3. Monitoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Lihat aktivitas di dashboard</li>
                <li>• Monitor pesan masuk/keluar</li>
                <li>• Tracking command yang dijalankan</li>
                <li>• Log error dan troubleshooting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}