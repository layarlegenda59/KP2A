import React, { useState, useEffect, useRef } from 'react';
import { whatsappCommandParser, UserContext } from '../../services/whatsappCommandParser';
import { whatsappNotificationService, NotificationLog } from '../../services/whatsappNotificationService';
import whatsappSocketService from '../../services/whatsapp-socket.service';
import { WhatsAppStatus } from '../../services/whatsapp-socket.service';
import WhatsAppDiagnostics from './WhatsAppDiagnostics';

interface ChatMessage {
  id: string;
  from: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

export default function WhatsAppMobileTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [testCommand, setTestCommand] = useState('');
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    todayCount: 0
  });
  const [userContext] = useState<UserContext>({
    phoneNumber: '+62 812-1111-1111',
    isAdmin: false,
    memberId: 'A001',
    name: 'SIDARSIH Bot'
  });
  
  // Session management states
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isClearingSession, setIsClearingSession] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'connection' | 'chat' | 'notifications' | 'diagnostics'>('connection');

  // Unique ID generator to prevent duplicate React keys
  const messageIdCounter = useRef(0);
  const generateUniqueId = () => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  };

  // Setup WhatsApp Socket Service listeners
  useEffect(() => {
    let statusChangeCleanup: (() => void) | undefined;
    let qrCodeCleanup: (() => void) | undefined;
    let connectionCleanup: (() => void) | undefined;
    
    try {
      console.log('🔧 Setting up WhatsApp Socket Service listeners...');

      // Listen for status changes with error handling
      const handleStatusChange = (status: WhatsAppStatus) => {
        console.log('📱 WhatsApp Status Update:', status);
        setConnectionStatus(status);
        
        try {
          if (status.status === 'ready' && status.isConnected) {
            setIsConnected(true);
            setIsLoading(false);
            // Add welcome message when connected
            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              from: 'bot',
              message: `🎉 WhatsApp terhubung!\n\n✅ Koneksi aktif dan siap digunakan\n📱 Nomor: ${status.phoneNumber || 'Unknown'}\nStatus: ${status.status}\nWaktu: ${new Date(status.timestamp).toLocaleString('id-ID')}\n🔄 Session akan tetap aktif hingga Anda logout`,
              timestamp: new Date()
            };
            setChatMessages([welcomeMessage]);
          } else if (status.status === 'disconnected') {
            setIsConnected(false);
            setIsLoading(false);
            
            const disconnectMessage: ChatMessage = {
              id: generateUniqueId(),
              from: 'bot',
              message: '🔌 WhatsApp terputus.\n\n⚠️ Koneksi dengan WhatsApp Web terputus\n🔄 Silakan generate QR Code baru untuk menghubungkan kembali\n💡 Pastikan WhatsApp Mobile Anda tetap online',
              timestamp: new Date()
            };
            setChatMessages([disconnectMessage]);
          } else if (status.status === 'error') {
            setIsLoading(false);
            console.error('❌ WhatsApp Error:', status.message);
            
            const errorMessage: ChatMessage = {
              id: generateUniqueId(),
              from: 'bot',
              message: `❌ Error WhatsApp: ${status.message || 'Unknown error'}\n\n🔄 Silakan coba lagi\n💡 Jika masalah berlanjut, refresh halaman`,
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
          } else if (status.status === 'connecting') {
            const connectingMessage: ChatMessage = {
              id: generateUniqueId(),
              from: 'bot',
              message: '🔄 Sedang menghubungkan ke WhatsApp...\n\n⏳ Mohon tunggu sebentar\n📱 Pastikan WhatsApp Mobile Anda online',
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, connectingMessage]);
          }
        } catch (statusError) {
          console.error('❌ Error handling status change:', statusError);
        }
      };

      // Listen for QR codes with validation
      const handleQRCode = (qrCodeData: string) => {
        console.log('📱 QR Code received:', qrCodeData ? 'QR Code data available' : 'No QR Code data');
        
        try {
          // Validate QR code data
          if (!qrCodeData || typeof qrCodeData !== 'string' || qrCodeData.length < 10) {
            console.warn('⚠️ Invalid QR code data received:', qrCodeData);
            
            const invalidQrMessage: ChatMessage = {
              id: Date.now().toString(),
              from: 'bot',
              message: '⚠️ QR Code tidak valid diterima.\n\n🔄 Mencoba generate QR Code baru...\n💡 Jika masalah berlanjut, coba refresh halaman',
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, invalidQrMessage]);
            return;
          }
          
          setQrCode(qrCodeData);
          setIsLoading(false);
          
          const qrMessage: ChatMessage = {
            id: generateUniqueId(),
            from: 'bot',
            message: '📱 QR Code berhasil di-generate!\n\n✅ QR Code valid dan siap di-scan\n👆 Buka WhatsApp Mobile → Menu (⋮) → Linked Devices → Link a Device\n📷 Scan QR Code di atas\n⏰ QR Code akan expired dalam 20 detik',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, qrMessage]);
          
        } catch (qrError) {
          console.error('❌ Error handling QR code:', qrError);
          
          const qrErrorMessage: ChatMessage = {
            id: generateUniqueId(),
            from: 'bot',
            message: '❌ Error saat memproses QR Code.\n\n🔄 Silakan coba generate QR Code lagi\n💡 Jika masalah berlanjut, refresh halaman',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, qrErrorMessage]);
        }
      };

      // Listen for connection status with error handling
      const handleConnection = (connected: boolean) => {
        console.log('🔗 Connection status:', connected);
        
        try {
          if (!connected) {
            setIsConnected(false);
            setIsLoading(false);
            
            const connectionLostMessage: ChatMessage = {
              id: Date.now().toString(),
              from: 'bot',
              message: '🔗 Koneksi socket terputus.\n\n⚠️ Kehilangan koneksi dengan server\n🔄 Mencoba reconnect otomatis...\n💡 Periksa koneksi internet Anda',
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, connectionLostMessage]);
          } else {
            const connectionRestoredMessage: ChatMessage = {
              id: Date.now().toString(),
              from: 'bot',
              message: '🔗 Koneksi socket berhasil dipulihkan!\n\n✅ Terhubung kembali dengan server\n🔄 Status WhatsApp akan diperbarui otomatis',
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, connectionRestoredMessage]);
          }
        } catch (connectionError) {
          console.error('❌ Error handling connection change:', connectionError);
        }
      };

      // Register listeners with error handling
      console.log('📡 Registering WhatsApp Socket Service listeners...');
      
      try {
        statusChangeCleanup = whatsappSocketService.onStatusChange(handleStatusChange);
        console.log('✅ Status change listener registered');
      } catch (error) {
        console.error('❌ Failed to register status change listener:', error);
      }
      
      try {
        qrCodeCleanup = whatsappSocketService.onQRCode(handleQRCode);
        console.log('✅ QR code listener registered');
      } catch (error) {
        console.error('❌ Failed to register QR code listener:', error);
      }
      
      try {
        connectionCleanup = whatsappSocketService.onConnection(handleConnection);
        console.log('✅ Connection listener registered');
      } catch (error) {
        console.error('❌ Failed to register connection listener:', error);
      }
      
      console.log('🎯 All listeners registration completed');
      
    } catch (setupError) {
      console.error('❌ Error setting up socket listeners:', setupError);
      
      const setupErrorMessage: ChatMessage = {
        id: generateUniqueId(),
        from: 'bot',
        message: '❌ Error saat setup koneksi socket.\n\n🔄 Silakan refresh halaman\n💡 Pastikan backend service berjalan',
        timestamp: new Date()
      };
      setChatMessages([setupErrorMessage]);
    }

    // Cleanup function
    return () => {
      try {
        console.log('🧹 Cleaning up WhatsApp Socket Service listeners...');
        
        // Clean up status change listener
        if (statusChangeCleanup && typeof statusChangeCleanup === 'function') {
          console.log('🧹 Cleaning up status change listener...');
          statusChangeCleanup();
        }
        
        // Clean up QR code listener
        if (qrCodeCleanup && typeof qrCodeCleanup === 'function') {
          console.log('🧹 Cleaning up QR code listener...');
          qrCodeCleanup();
        }
        
        // Clean up connection listener
        if (connectionCleanup && typeof connectionCleanup === 'function') {
          console.log('🧹 Cleaning up connection listener...');
          connectionCleanup();
        }
        
        console.log('✅ All WhatsApp Socket Service listeners cleaned up successfully');
        
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
        // Don't throw the error to prevent React from showing error boundary
      }
    };
  }, []);

  // Update notification data
  const updateNotificationData = () => {
    setNotificationLogs(whatsappNotificationService.getNotificationLogs(10));
    setNotificationStats(whatsappNotificationService.getNotificationStats());
  };

  // Get base URL from environment variables
  const getBaseUrl = () => {
    return import.meta.env.VITE_WHATSAPP_API_URL || 
           import.meta.env.VITE_API_URL || 
           'https://api.sidarsih.site';
  };

  // Session management functions
  const fetchSessionInfo = async (retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      console.log(`📊 Fetching session info (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Add retry delay for subsequent attempts
      if (retryCount > 0) {
        const delay = 1000 * (retryCount + 1); // Linear backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(`${getBaseUrl()}/api/whatsapp/session-info`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSessionInfo(data.data);
        setCurrentSessionId(data.data.currentSessionId || data.data.sessionId || '');
        console.log('✅ Session info fetched successfully');
      } else {
        throw new Error(data.error || data.details || 'Failed to fetch session info');
      }
      
    } catch (error) {
      console.error(`❌ Error fetching session info (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a retryable error
      const isRetryableError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('HTTP 5')
      );
      
      if (isRetryableError && retryCount < maxRetries) {
        console.log(`🔄 Retrying session info fetch... (${retryCount + 1}/${maxRetries})`);
        
        // Retry after delay
        setTimeout(() => {
          fetchSessionInfo(retryCount + 1);
        }, 1000);
        return;
      }
      
      // Final error - set default values
      console.warn('⚠️ Using default session info due to fetch failure');
      setSessionInfo({
        sessionId: 'mobile-test-session',
        status: 'disconnected',
        isConnected: false,
        lastActivity: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setCurrentSessionId('mobile-test-session');
    }
  };

  const handleClearSession = async (retryCount = 0) => {
    const maxRetries = 2;
    setIsClearingSession(true);
    
    try {
      console.log(`🧹 Clearing session (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Clear session from whatsappSocketService first
      if (whatsappSocketService.logout) {
        try {
          await whatsappSocketService.logout();
          console.log('✅ Socket service logout successful');
        } catch (logoutError) {
          console.warn('⚠️ Socket service logout failed:', logoutError);
          // Continue with session creation even if logout fails
          // This is expected when backend is not connected
        }
      }
      
      // Add retry delay for subsequent attempts
      if (retryCount > 0) {
        const delay = 2000 * (retryCount + 1); // Linear backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${getBaseUrl()}/api/whatsapp/clear-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Reset all states
        setIsConnected(false);
        setQrCode('');
        setConnectionStatus(null);
        setCurrentSessionId('');
        
        // Add success message
        const successMessage: ChatMessage = {
          id: generateUniqueId(),
          from: 'bot',
          message: '🧹 Session berhasil dibersihkan!\n\n✅ Semua data session telah dihapus\n🆕 Anda dapat membuat session baru sekarang\n🔄 Status koneksi telah direset',
          timestamp: new Date()
        };
        setChatMessages([successMessage]);
        
        // Fetch updated session info
        await fetchSessionInfo();
        
        console.log('✅ Session cleared successfully');
        
      } else {
        throw new Error(data.error || data.details || 'Failed to clear session');
      }
      
    } catch (error) {
      console.error(`❌ Failed to clear session (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a retryable error
      const isRetryableError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('HTTP 5')
      );
      
      if (isRetryableError && retryCount < maxRetries) {
        console.log(`🔄 Retrying clear session... (${retryCount + 1}/${maxRetries})`);
        
        const retryMessage: ChatMessage = {
          id: generateUniqueId(),
          from: 'bot',
          message: `⚠️ Gagal membersihkan session (percobaan ${retryCount + 1}). Mencoba lagi... (${retryCount + 2}/${maxRetries + 1})`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, retryMessage]);
        
        // Retry after delay
        setTimeout(() => {
          handleClearSession(retryCount + 1);
        }, 1000);
        return;
      }
      
      // Final error message
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        from: 'bot',
        message: `❌ Gagal membersihkan session setelah ${retryCount + 1} percobaan.\n\n🔍 Detail Error: ${errorDetails}\n\n💡 Solusi:\n• Refresh halaman dan coba lagi\n• Periksa koneksi internet\n• Pastikan backend service berjalan\n• Hubungi admin jika masalah berlanjut`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsClearingSession(false);
    }
  };

  const handleNewSession = async (retryCount = 0) => {
    const maxRetries = 3;
    setIsClearingSession(true);
    
    // Variables for proper cleanup
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log(`🆕 Creating new session (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Clear session from whatsappSocketService first
      if (whatsappSocketService.logout) {
        try {
          await whatsappSocketService.logout();
          console.log('✅ Socket service logout successful');
        } catch (logoutError) {
          console.warn('⚠️ Socket service logout failed:', logoutError);
        }
      }
      
      // Add retry delay for subsequent attempts
      if (retryCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Create AbortController with proper timeout handling
      controller = new AbortController();
      const timeoutDuration = 30000; // Increased to 30 seconds for session creation
      
      console.log(`🔗 Starting fetch request with ${timeoutDuration/1000}s timeout...`);
      
      // Set up timeout with proper cleanup
      timeoutId = setTimeout(() => {
        if (controller && !controller.signal.aborted) {
          console.log('⏰ Request timeout reached, aborting...');
          controller.abort();
        }
      }, timeoutDuration);
      
      const fetchPromise = fetch(`${getBaseUrl()}/api/whatsapp/new-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      console.log('📡 Sending request to backend...');
      const response = await fetchPromise;
      
      // Clear timeout immediately after successful fetch
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log(`📥 Response received: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📋 Response data parsed successfully');
      
      if (data.success) {
        setCurrentSessionId(data.data.sessionId);
        
        // Reset connection states
        setIsConnected(false);
        setQrCode('');
        setConnectionStatus(null);
        
        // Add success message with compatibility info
        const compatibilityInfo = data.data.compatibility;
        const successMessage: ChatMessage = {
          id: generateUniqueId(),
          from: 'bot',
          message: `🆕 Session baru berhasil dibuat!\n\n📱 Session ID: ${data.data.sessionId}\n\n✅ Kompatibilitas WhatsApp Mobile:\n• Versi: ${compatibilityInfo?.version || 'Terbaru'}\n• QR Scanning: ${compatibilityInfo?.features?.qrCodeScanning ? '✅' : '❌'}\n• Multi Device: ${compatibilityInfo?.features?.multiDevice ? '✅' : '❌'}\n\n🔄 Silakan klik "Generate QR Code" untuk menghubungkan WhatsApp Mobile Anda.`,
          timestamp: new Date()
        };
        setChatMessages([successMessage]);
        
        // Fetch updated session info
        await fetchSessionInfo();
        
        console.log('✅ New session created successfully');
        
      } else {
        throw new Error(data.error || data.details || 'Failed to create new session');
      }
      
    } catch (error) {
      // Clean up timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Enhanced error logging
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Failed to create new session (attempt ${retryCount + 1}):`, {
        name: errorName,
        message: errorMessage,
        isAbortError: errorName === 'AbortError',
        retryCount,
        maxRetries
      });
      
      // Improved retry logic with better error classification
      const isRetryableError = error instanceof Error && (
        error.name === 'AbortError' ||
        (error.name === 'TypeError' && error.message.includes('fetch')) ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('HTTP 5') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NETWORK')
      );
      
      if (isRetryableError && retryCount < maxRetries) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${maxRetries}) - Error was: ${errorName}`);
        
        const retryMessage: ChatMessage = {
          id: generateUniqueId(),
          from: 'bot',
          message: `⚠️ Gagal membuat session (percobaan ${retryCount + 1}). Mencoba lagi... (${retryCount + 2}/${maxRetries + 1})\n\n🔍 Alasan: ${errorName === 'AbortError' ? 'Timeout jaringan' : 'Masalah koneksi'}`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, retryMessage]);
        
        // Retry after a short delay
        setTimeout(() => {
          handleNewSession(retryCount + 1);
        }, 1000);
        return;
      }
      
      // Final error message with better error details
      const errorDetails = errorName === 'AbortError' 
        ? 'Request timeout - Backend mungkin sedang sibuk atau tidak responsif'
        : errorMessage;
        
      const finalErrorMessage: ChatMessage = {
        id: generateUniqueId(),
        from: 'bot',
        message: `❌ Gagal membuat session baru setelah ${retryCount + 1} percobaan.\n\n🔍 Detail Error: ${errorDetails}\n\n💡 Solusi:\n• Periksa koneksi internet\n• Pastikan backend service berjalan (port 3001)\n• Coba refresh halaman\n• Tunggu beberapa saat dan coba lagi\n• Hubungi admin jika masalah berlanjut`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, finalErrorMessage]);
      
    } finally {
      // Final cleanup
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsClearingSession(false);
    }
  };

  useEffect(() => {
    updateNotificationData();
    fetchSessionInfo();
    const interval = setInterval(updateNotificationData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleGenerateQR = async (retryCount = 0) => {
    const maxRetries = 3;
    console.log(`🚀 Generate QR Code button clicked (attempt ${retryCount + 1}/${maxRetries + 1})`);
    setIsLoading(true);
    setQrCode('');
    
    try {
      // Check if we have a valid session
      if (!currentSessionId) {
        throw new Error('No active session. Please create a new session first.');
      }
      
      // Add retry delay for subsequent attempts
      if (retryCount > 0) {
        const delay = Math.min(2000 * Math.pow(2, retryCount), 8000); // Exponential backoff, max 8s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Add loading message
      const loadingMessage: ChatMessage = {
        id: Date.now().toString(),
        from: 'bot',
        message: `🔄 Sedang generate QR Code... (percobaan ${retryCount + 1}/${maxRetries + 1})\n\n⏳ Mohon tunggu, proses ini membutuhkan waktu 10-30 detik.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, loadingMessage]);
      
      // Try direct API call first as fallback
      let controller: AbortController | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          if (controller) {
            controller.abort();
          }
        }, 30000); // 30 second timeout to allow backend QR generation (20s) + buffer
        
        const response = await fetch(`${getBaseUrl()}/api/whatsapp/generate-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: currentSessionId
          }),
          signal: controller.signal
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ QR generation initiated via API');
            
            const apiSuccessMessage: ChatMessage = {
              id: Date.now().toString(),
              from: 'bot',
              message: `✅ QR Code generation berhasil dimulai!\n\n📱 Session: ${data.data.sessionId}\n⏰ Expires: ${data.data.expiration}\n\n🔄 QR Code akan muncul dalam beberapa detik. Siapkan WhatsApp Mobile Anda untuk scan.`,
              timestamp: new Date()
            };
            setChatMessages(prev => [...prev, apiSuccessMessage]);
          }
        }
      } catch (apiError) {
        // Clean up timeout and controller
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (apiError instanceof Error && apiError.name === 'AbortError') {
          console.warn('⚠️ API request timeout, using socket service instead');
          
          const fallbackMessage: ChatMessage = {
            id: generateUniqueId(),
            from: 'bot',
            message: '⚡ API timeout, beralih ke koneksi socket untuk performa lebih baik...',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, fallbackMessage]);
        } else {
          console.warn('⚠️ API fallback failed, using socket service:', apiError);
          
          const errorMessage: ChatMessage = {
            id: generateUniqueId(),
            from: 'bot',
            message: '🔄 Menggunakan koneksi alternatif untuk stabilitas yang lebih baik...',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMessage]);
        }
      } finally {
        // Final cleanup
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        controller = null;
      }
      
      // Initialize WhatsApp connection
      await whatsappSocketService.initializeWhatsApp('mobile-test-session');
      console.log('✅ WhatsApp initialization requested');
      
      // Set up QR timeout
      const qrTimeout = setTimeout(() => {
        if (!qrCode) {
          console.warn('⚠️ QR Code generation timeout');
          
          const timeoutMessage: ChatMessage = {
            id: generateUniqueId(),
            from: 'bot',
            message: `⏰ QR Code generation timeout (${retryCount + 1}/${maxRetries + 1}). ${retryCount < maxRetries ? 'Mencoba ulang dalam 2 detik...' : 'Silakan coba lagi nanti.'}`,
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, timeoutMessage]);
          
          // Auto retry if we haven't exceeded max retries
          if (retryCount < maxRetries) {
            setTimeout(() => {
              handleGenerateQR(retryCount + 1);
            }, 2000);
          }
        }
      }, 25000); // 25 second timeout to allow backend processing time
      
      // Clear timeout when QR is received
      const originalQrCode = qrCode;
      const checkQrInterval = setInterval(() => {
        if (qrCode && qrCode !== originalQrCode) {
          clearTimeout(qrTimeout);
          clearInterval(checkQrInterval);
          console.log('✅ QR Code received successfully');
        }
      }, 1000);
      
      // Clean up interval after 30 seconds
      setTimeout(() => {
        clearInterval(checkQrInterval);
      }, 30000);
      
    } catch (error) {
      console.error(`❌ Failed to generate QR code (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a retryable error
      const isRetryableError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('HTTP 5') ||
        error.message.includes('socket') ||
        error.message.includes('connection')
      );
      
      if (isRetryableError && retryCount < maxRetries) {
        console.log(`🔄 Retrying QR generation... (${retryCount + 1}/${maxRetries})`);
        
        const retryMessage: ChatMessage = {
          id: generateUniqueId(),
          from: 'bot',
          message: `⚠️ Gagal generate QR Code (percobaan ${retryCount + 1}). Mencoba lagi... (${retryCount + 2}/${maxRetries + 1})`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, retryMessage]);
        
        // Retry after exponential backoff delay
        const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 8000); // Max 8 seconds
        setTimeout(() => {
          handleGenerateQR(retryCount + 1);
        }, retryDelay);
        return;
      }
      
      // Final error message
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: generateUniqueId(),
        from: 'bot',
        message: `❌ Gagal generate QR Code setelah ${retryCount + 1} percobaan.\n\n🔍 Detail Error: ${errorDetails}\n\n💡 Solusi:\n• Pastikan session aktif (buat session baru jika perlu)\n• Periksa koneksi internet\n• Pastikan backend service berjalan\n• Coba refresh halaman\n• Hubungi admin jika masalah berlanjut`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      setIsLoading(false);
    }
  };



  const handleDisconnect = async () => {
    try {
      await whatsappSocketService.disconnect();
      setIsConnected(false);
      setQrCode('');
      setChatMessages([]);
      setConnectionStatus(null);
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    }
  };

  const handleSendCommand = () => {
    if (!testCommand.trim() || !isConnected) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      from: 'user',
      message: testCommand,
      timestamp: new Date()
    };

    // Process command
    const response = whatsappCommandParser.parseCommand(testCommand, userContext);
    
    // Add bot response
    const botMessage: ChatMessage = {
      id: generateUniqueId(),
      from: 'bot',
      message: response.message,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage, botMessage]);
    setTestCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  const formatMessage = (message: string) => {
    return message.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < message.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Test notification functions
  const handleTestTransactionNotification = async () => {
    await whatsappNotificationService.sendNotification('new_transaction', {
      phoneNumber: userContext.phoneNumber,
      name: userContext.name || 'Anggota KP2A',
      memberId: userContext.memberId,
      isAdmin: userContext.isAdmin
    }, {
      name: userContext.name || 'Anggota KP2A',
      type: 'Simpanan Wajib',
      amount: '50.000',
      date: new Date().toLocaleDateString('id-ID'),
      balance: '2.250.000'
    });
    updateNotificationData();
  };

  const handleTestPaymentReminder = async () => {
    await whatsappNotificationService.sendNotification('payment_reminder', {
      phoneNumber: userContext.phoneNumber,
      name: userContext.name || 'Anggota KP2A',
      memberId: userContext.memberId,
      isAdmin: userContext.isAdmin
    }, {
      name: userContext.name || 'Anggota KP2A',
      dueDate: '15 Februari 2024',
      amount: '450.000'
    });
    updateNotificationData();
  };

  const handleTestAdminAlert = async () => {
    await whatsappNotificationService.sendAdminAlert(
      'Database backup completed successfully. All data has been safely stored.',
      'medium'
    );
    updateNotificationData();
  };

  const handleTestBulkNotification = async () => {
    const recipients = [
      {
        phoneNumber: '+62 812-1111-1111',
        name: 'SIDARSIH Bot',
        memberId: 'A001',
        isAdmin: false
      },
      {
        phoneNumber: '+62 812-2222-2222',
        name: 'Budi Santoso',
        memberId: 'A002',
        isAdmin: false
      },
      {
        phoneNumber: '+62 812-3333-3333',
        name: 'Lina Marlina',
        memberId: 'A003',
        isAdmin: false
      }
    ];

    await whatsappNotificationService.sendBulkNotification('meeting_reminder', recipients, {
      date: '25 Februari 2024',
      time: '19:00 WIB',
      location: 'Kantor KP2A Cimahi'
    });
    updateNotificationData();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">WhatsApp Mobile Integration</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Hubungkan aplikasi dengan WhatsApp mobile Anda untuk monitoring dan kontrol remote
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex border-b border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('connection')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'connection'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🔗 Connection
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            💬 Chat Test
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🔔 Notifications
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🔧 Diagnostics
          </button>
        </div>
        
        <div className="p-6">
          <>
            {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Session Information */}
                {sessionInfo && (
                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-blue-200 dark:border-blue-700">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      <strong>Session ID:</strong> {currentSessionId}<br/>
                      <strong>Session Status:</strong> {sessionInfo.connected ? 'Aktif' : 'Tidak Aktif'}<br/>
                      {sessionInfo.phoneNumber && <><strong>Nomor Terhubung:</strong> {sessionInfo.phoneNumber}<br/></>}
                    </div>
                  </div>
                )}

                {/* Connection Status Display */}
                {connectionStatus && (
                  <div className={`p-3 rounded-lg border ${
                    connectionStatus.status === 'ready' ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-green-200 dark:border-green-700' :
                    connectionStatus.status === 'error' ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-700' :
                    connectionStatus.status === 'connecting' || connectionStatus.status === 'initializing' ? 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border-yellow-200 dark:border-yellow-700' :
                    'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      <strong>Status:</strong> {connectionStatus.status}<br/>
                      <strong>Connected:</strong> {connectionStatus.isConnected ? 'Ya' : 'Tidak'}<br/>
                      <strong>Waktu:</strong> {new Date(connectionStatus.timestamp).toLocaleString('id-ID')}<br/>
                      {connectionStatus.phoneNumber && <><strong>Nomor:</strong> {connectionStatus.phoneNumber}<br/></>}
                      {connectionStatus.message && <><strong>Pesan:</strong> {connectionStatus.message}</>}
                    </div>
                  </div>
                )}

                {isConnected ? (
            <div className="p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-700 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">✅ WhatsApp Mobile Terhubung!</p>
              <p className="text-green-600 dark:text-green-400 text-sm">Nomor: {connectionStatus?.phoneNumber || userContext.phoneNumber}</p>
              <p className="text-green-600 dark:text-green-400 text-sm">Nama: {userContext.name}</p>
              <div className="mt-2 flex gap-2">
                <button 
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded"
                >
                  Disconnect
                </button>
                <button 
                  onClick={handleClearSession}
                  disabled={isClearingSession}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isClearingSession ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Clearing...
                    </>
                  ) : (
                    'Clear Session'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">WhatsApp mobile belum terhubung.</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleGenerateQR}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate QR Code'
                  )}
                </button>
                <button 
                  onClick={handleNewSession}
                  disabled={isLoading || isClearingSession}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isClearingSession ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'New Session'
                  )}
                </button>
              </div>
              
              {/* QR Code Display */}
              {qrCode && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-300 font-medium mb-3">📱 Scan QR Code dengan WhatsApp:</p>
                  <div className="flex justify-center mb-3">
                    <img 
                      src={qrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 border rounded-lg bg-white"
                      onError={(e) => {
                        console.error('QR Code image failed to load');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    <p>1. Buka WhatsApp di ponsel Anda</p>
                    <p>2. Tap Menu (⋮) → Linked Devices</p>
                    <p>3. Tap "Link a Device"</p>
                    <p>4. Scan QR code di atas</p>
                  </div>
                </div>
              )}
              
              {isLoading && !qrCode && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 dark:border-yellow-400"></div>
                    <p className="text-yellow-800 dark:text-yellow-300">Menghubungkan ke backend WhatsApp...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

          {activeTab === 'chat' && (
            <div className="space-y-6">
              {isConnected ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">💬 Chat Interface - Test Commands</h2>
                  
                  {/* Chat Messages */}
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg h-96 overflow-y-auto p-4 mb-4 bg-gray-50 dark:bg-gray-700">
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center">Mulai percakapan dengan mengirim perintah...</p>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.from === 'user' 
                                ? 'bg-blue-500 dark:bg-blue-600 text-white' 
                                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                            }`}>
                              <div className="text-sm whitespace-pre-wrap">
                                {formatMessage(msg.message)}
                              </div>
                              <div className={`text-xs mt-1 ${
                                msg.from === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {msg.timestamp.toLocaleTimeString('id-ID')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Command Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testCommand}
                      onChange={(e) => setTestCommand(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ketik perintah (contoh: help, saldo, status)"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendCommand}
                      disabled={!testCommand.trim()}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600"
                    >
                      Kirim
                    </button>
                  </div>

                  {/* Quick Commands */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Quick Commands:</p>
                    <div className="flex flex-wrap gap-2">
                      {['help', 'status', 'saldo', 'pinjaman', 'riwayat', 'info'].map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => setTestCommand(cmd)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 rounded border border-gray-200 dark:border-gray-500"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Hubungkan WhatsApp terlebih dahulu untuk menggunakan chat interface.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">🔔 Notification Management</h2>
              
              {/* Notification Statistics */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">📊 Statistik Notifikasi</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notificationStats.total}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{notificationStats.sent}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">Terkirim</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{notificationStats.failed}</div>
                    <div className="text-sm text-red-600 dark:text-red-400">Gagal</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{notificationStats.pending}</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{notificationStats.todayCount}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Hari Ini</div>
                  </div>
                </div>
              </div>

              {/* Test Notifications */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">🧪 Test Notifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleTestTransactionNotification}
                    className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">💰 Test Transaction Notification</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Kirim notifikasi transaksi baru</div>
                  </button>
                  <button
                    onClick={handleTestPaymentReminder}
                    className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">⏰ Test Payment Reminder</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Kirim pengingat jatuh tempo</div>
                  </button>
                  <button
                    onClick={handleTestAdminAlert}
                    className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">🚨 Test Admin Alert</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Kirim alert ke admin</div>
                  </button>
                  <button
                    onClick={handleTestBulkNotification}
                    className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">📢 Test Bulk Notification</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Kirim notifikasi ke banyak anggota</div>
                  </button>
                </div>
              </div>

              {/* Notification Logs */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">📋 Log Notifikasi (10 Terakhir)</h3>
                {notificationLogs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">Belum ada log notifikasi</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notificationLogs.map((log) => (
                      <div key={log.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.recipient}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              log.status === 'sent' ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300' :
                              log.status === 'failed' ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300' :
                              'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-800 dark:text-yellow-300'
                            }`}>
                              {log.status === 'sent' ? 'Terkirim' : 
                               log.status === 'failed' ? 'Gagal' : 'Pending'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {log.timestamp.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {log.message.length > 100 ? log.message.substring(0, 100) + '...' : log.message}
                        </div>
                        {log.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Error: {log.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div>
              <WhatsAppDiagnostics />
            </div>
          )}
          </>
        </div>
      </div>
    </div>
  );
}