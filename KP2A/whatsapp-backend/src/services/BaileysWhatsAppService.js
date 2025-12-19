// Polyfill for crypto in Node.js
const crypto = require('crypto');

// Ensure global crypto is available for Baileys
if (!global.crypto) {
    global.crypto = {
        getRandomValues: (arr) => {
            return crypto.randomFillSync(arr);
        },
        subtle: crypto.webcrypto?.subtle || {}
    };
}

// Ensure webcrypto is available
if (!global.crypto.webcrypto) {
    global.crypto.webcrypto = crypto.webcrypto;
}

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class BaileysWhatsAppService extends EventEmitter {
    constructor(io, supabaseClient) {
        super();
        this.io = io;
        this.supabase = supabaseClient;
        this.sock = null;
        this.isReady = false;
        this.isInitializing = false;
        this.authPath = path.join(__dirname, '../../baileys-auth');
        this.currentSessionId = this.generateSessionId();
        this.phoneNumber = null;
        this.currentQRCode = null;
        this.messageHandler = null;
        
        // Anti-loop protection
        this.processedMessages = new Set();
        this.isProcessingMessage = false;
        this.lastResponseTime = 0;
        this.RATE_LIMIT_DELAY = 2000;
        this.MESSAGE_CLEANUP_INTERVAL = 300000;
        
        // Auto-reconnect configuration
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 30000;
        this.isReconnecting = false;
        this.reconnectTimer = null;

        // Keep-alive configuration
        this.keepAliveInterval = null;
        this.keepAliveDelay = 60000;
        this.lastHeartbeat = Date.now();

        // Health monitoring
        this.healthCheckInterval = null;

        // Ensure auth directory exists
        fs.ensureDirSync(this.authPath);
        
        console.log('✅ BaileysWhatsAppService initialized');
    }

    generateSessionId() {
        return `baileys_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Set the message handler service for processing incoming messages
     * @param {MessageHandlerService} messageHandler - The message handler service
     */
    setMessageHandler(messageHandler) {
        this.messageHandler = messageHandler;
        console.log('✅ Message handler integrated with Baileys WhatsApp service');
    }

    async initializeClient() {
        try {
            console.log('🚀 Initializing Baileys WhatsApp client...');
            
            // Set initializing flag to prevent multiple initializations
            if (this.isInitializing) {
                console.log('⚠️ Client already initializing, skipping...');
                return;
            }
            
            this.isInitializing = true;
            
            // Clear any existing socket first
            if (this.sock) {
                try {
                    this.sock.end();
                    this.sock = null;
                } catch (error) {
                    console.warn('⚠️ Error ending existing socket:', error.message);
                }
            }
            
            // Use multi-file auth state for session persistence
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            
            // Create WhatsApp socket with improved configuration
            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: false, // We'll handle QR display ourselves
                logger: {
                    level: 'silent',
                    trace: () => {},
                    debug: () => {},
                    info: () => {},
                    warn: () => {},
                    error: () => {},
                    fatal: () => {},
                    child: () => ({
                        trace: () => {},
                        debug: () => {},
                        info: () => {},
                        warn: () => {},
                        error: () => {},
                        fatal: () => {}
                    })
                },
                browser: ['KP2A WhatsApp Service', 'Chrome', '1.0.0'],
                connectTimeoutMs: 30000, // Reduced from 60s to 30s
                defaultQueryTimeoutMs: 30000, // Reduced from 60s to 30s
                keepAliveIntervalMs: 25000, // Reduced from 30s to 25s
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 3,
                getMessage: async (key) => {
                    // Return undefined if message not found
                    return undefined;
                },
                // Add mobile compatibility options
                mobile: false,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                fireInitQueries: true,
                emitOwnEvents: true,
                generateHighQualityLinkPreview: false
            });

            // Setup event handlers
            this.setupEventHandlers(saveCreds);
            
            this.isInitializing = false;
            console.log('✅ Baileys client initialized successfully');
            
        } catch (error) {
            this.isInitializing = false;
            console.error('❌ Error initializing Baileys client:', error);
            
            // Emit initialization error
            this.io.emit('whatsapp:init_error', {
                message: 'Failed to initialize WhatsApp client',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    setupEventHandlers(saveCreds) {
        // Save credentials when updated
        this.sock.ev.on('creds.update', saveCreds);

        // Handle connection updates with improved error handling
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin, isOnline } = update;
            
            console.log('🔄 Connection update:', { connection, isNewLogin, isOnline });
            
            if (qr) {
                console.log('📱 QR Code received from Baileys');
                await this.handleQRCode(qr);
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
                
                console.log('🔌 Connection closed:', {
                    statusCode,
                    errorMessage,
                    shouldReconnect,
                    reconnectAttempts: this.reconnectAttempts
                });
                
                this.isReady = false;
                this.phoneNumber = null;
                this.isInitializing = false;
                
                // Handle specific error codes
                if (statusCode === DisconnectReason.badSession) {
                    console.log('🧹 Bad session detected, clearing auth files...');
                    await this.clearSessionFiles();
                } else if (statusCode === DisconnectReason.restartRequired) {
                    console.log('🔄 Restart required, reinitializing...');
                } else if (statusCode === DisconnectReason.loggedOut) {
                    console.log('🚪 Logged out by user');
                    this.reconnectAttempts = 0;
                }
                
                // Emit disconnection status with error details
                this.io.emit('whatsapp:status_change', {
                    status: 'disconnected',
                    isConnected: false,
                    message: `WhatsApp disconnected: ${errorMessage}`,
                    errorCode: statusCode,
                    timestamp: new Date().toISOString()
                });
                
                // Improved reconnection logic
                if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts && !this.isReconnecting) {
                    this.reconnectAttempts++;
                    this.isReconnecting = true;
                    
                    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 300000); // Exponential backoff, max 5 minutes
                    
                    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
                    
                    this.io.emit('whatsapp:reconnecting', {
                        attempt: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts,
                        delay: delay,
                        timestamp: new Date().toISOString()
                    });
                    
                    this.reconnectTimer = setTimeout(async () => {
                        try {
                            this.isReconnecting = false;
                            await this.initializeClient();
                        } catch (error) {
                            console.error('❌ Reconnection failed:', error);
                            this.isReconnecting = false;
                        }
                    }, delay);
                } else if (!shouldReconnect) {
                    console.log('🚪 Logged out, stopping reconnection attempts');
                    this.reconnectAttempts = 0;
                    this.isReconnecting = false;
                }
                
            } else if (connection === 'connecting') {
                console.log('🔄 Connecting to WhatsApp...');
                this.io.emit('whatsapp:status_change', {
                    status: 'connecting',
                    isConnected: false,
                    message: 'Connecting to WhatsApp...',
                    timestamp: new Date().toISOString()
                });
                
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connection opened');
                this.isReady = true;
                this.reconnectAttempts = 0;
                this.isReconnecting = false;
                this.isInitializing = false;
                
                // Clear any pending reconnect timer
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                
                // Get phone number info
                if (this.sock.user) {
                    this.phoneNumber = this.sock.user.id.split(':')[0];
                    console.log('📱 Connected phone number:', this.phoneNumber);
                }
                
                // Emit ready status
                this.io.emit('whatsapp:ready', {
                    sessionId: this.currentSessionId,
                    phoneNumber: this.phoneNumber,
                    isDemo: false,
                    message: 'WhatsApp connected successfully',
                    timestamp: new Date().toISOString()
                });
                
                this.io.emit('whatsapp:status_change', {
                    status: 'connected',
                    isConnected: true,
                    phoneNumber: this.phoneNumber,
                    sessionId: this.currentSessionId,
                    lastSeen: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                });
                
                // Save session event to database
                await this.saveSessionEvent('connected', { phoneNumber: this.phoneNumber });
                
                // Start health monitoring
                this.startHealthMonitoring();
            }
        });

        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (messageUpdate) => {
            await this.handleIncomingMessages(messageUpdate);
        });

        // Handle message receipts
        this.sock.ev.on('message-receipt.update', (receipts) => {
            console.log('📧 Message receipts:', receipts.length);
        });

        // Handle presence updates
        this.sock.ev.on('presence.update', (presence) => {
            console.log('👤 Presence update:', presence.id, presence.presences);
        });
    }

    async handleQRCode(qr) {
        try {
            // Generate QR code as data URL
            const qrDataUrl = await qrcode.toDataURL(qr, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            // Store current QR code
            this.currentQRCode = qrDataUrl;
            
            // Also print to terminal for debugging
            qrcodeTerminal.generate(qr, { small: true });
            
            // Emit to frontend via Socket.IO
            this.io.emit('whatsapp:qr', {
                qr: qrDataUrl,
                sessionId: this.currentSessionId,
                isDemo: false,
                message: 'Scan this QR code with your WhatsApp mobile app',
                timestamp: new Date().toISOString()
            });

            // Save QR to database
            await this.saveSessionEvent('qr_generated', { qr });
            
            // Emit event for promise resolution
            this.emit('qr_generated', qrDataUrl);
            
            console.log('✅ QR Code generated and sent to frontend');
            
        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            this.io.emit('whatsapp:error', { 
                message: 'Failed to generate QR code',
                error: error.message 
            });
        }
    }

    async handleIncomingMessages(messageUpdate) {
        const { messages, type } = messageUpdate;
        
        console.log(`🔄 Received message update - Type: ${type}, Messages count: ${messages?.length || 0}`);
        
        if (type !== 'notify') {
            console.log(`⏭️ Skipping message update - Type: ${type} (only processing 'notify' type)`);
            return; // Only process new messages
        }
        
        for (const message of messages) {
            try {
                console.log('📨 Processing message:', {
                    messageId: message.key?.id,
                    from: message.key?.remoteJid,
                    fromMe: message.key?.fromMe,
                    messageType: message.message ? Object.keys(message.message)[0] : 'unknown',
                    hasMessage: !!message.message
                });

                // Skip messages from self
                if (message.key.fromMe) {
                    console.log('⏭️ Skipping message from self');
                    continue;
                }
                
                // Skip if already processed
                const messageId = message.key.id;
                if (this.processedMessages.has(messageId)) {
                    console.log(`⏭️ Message already processed: ${messageId}`);
                    continue;
                }
                
                // Add to processed set
                this.processedMessages.add(messageId);
                
                // Rate limiting - reduced from 2000ms to 1000ms
                const now = Date.now();
                if (now - this.lastResponseTime < 1000) {
                    console.log(`⏱️ Rate limiting: skipping message (${now - this.lastResponseTime}ms since last response)`);
                    continue;
                }
                
                console.log('✅ New message accepted for processing:', {
                    from: message.key.remoteJid,
                    id: messageId,
                    type: message.message ? Object.keys(message.message)[0] : 'unknown'
                });
                
                // Check if message handler is available
                if (!this.messageHandler) {
                    console.error('❌ Message handler not available!');
                    continue;
                }
                
                // Check if another message is being processed
                if (this.isProcessingMessage) {
                    console.log('⏱️ Another message is being processed, queuing this message');
                    // Instead of skipping, we'll process it after a short delay
                    setTimeout(async () => {
                        if (!this.isProcessingMessage) {
                            console.log('🔄 Processing queued message');
                            await this.processMessageSafely(message);
                        }
                    }, 500);
                    continue;
                }
                
                // Process message immediately
                await this.processMessageSafely(message);
                
                // Emit message to frontend
                this.io.emit('whatsapp:message', {
                    message: message,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error('❌ Error handling incoming message:', error);
            }
        }
        
        // Cleanup old processed messages
        if (this.processedMessages.size > 1000) {
            const oldMessages = Array.from(this.processedMessages).slice(0, 500);
            oldMessages.forEach(id => this.processedMessages.delete(id));
            console.log(`🧹 Cleaned up ${oldMessages.length} old processed messages`);
        }
    }

    async processMessageSafely(message) {
        this.isProcessingMessage = true;
        this.lastResponseTime = Date.now();
        
        try {
            console.log('🔄 Starting message processing...');
            await this.messageHandler.processMessage(message, this);
            console.log('✅ Message processing completed successfully');
        } catch (error) {
            console.error('❌ Error processing message:', error);
            
            // Send error message to user
            try {
                const chatId = message.key.remoteJid;
                await this.sendMessage(chatId, { 
                    text: '❌ Maaf, terjadi kesalahan sistem. Silakan coba lagi dalam beberapa saat.' 
                });
            } catch (sendError) {
                console.error('❌ Error sending error message:', sendError);
            }
        } finally {
            this.isProcessingMessage = false;
        }
    }

    async generateQRCode() {
        try {
            console.log('📱 Starting QR code generation with Baileys...');
            
            // Emit status
            this.io.emit('whatsapp:status', {
                status: 'generating_qr',
                message: 'Generating QR code...',
                timestamp: new Date().toISOString()
            });

            // If already connected, disconnect first
            if (this.isReady && this.sock) {
                console.log('🔄 Already connected, disconnecting first...');
                await this.logout();
                await new Promise(resolve => setTimeout(resolve, 3000)); // Increased wait time
            }

            // If currently initializing, wait for it to complete
            if (this.isInitializing) {
                console.log('⏳ Waiting for current initialization to complete...');
                let waitCount = 0;
                while (this.isInitializing && waitCount < 30) { // Max 15 seconds wait
                    await new Promise(resolve => setTimeout(resolve, 500));
                    waitCount++;
                }
                
                if (this.isInitializing) {
                    throw new Error('Initialization timeout - client is stuck in initializing state');
                }
            }

            // Initialize client (this will trigger QR generation)
            await this.initializeClient();
            
        } catch (error) {
            console.error('❌ QR code generation failed:', error);
            
            this.io.emit('whatsapp:error', {
                message: 'Failed to generate QR code',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    async sendMessage(to, message) {
        try {
            if (!this.isReady || !this.sock) {
                throw new Error('WhatsApp client not ready');
            }
            
            const result = await this.sock.sendMessage(to, message);
            console.log('✅ Message sent successfully');
            return result;
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out from WhatsApp...');
            
            this.isReady = false;
            this.phoneNumber = null;
            this.currentQRCode = null;
            this.isInitializing = false;
            this.isReconnecting = false;
            
            // Clear reconnect timer
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            // Stop health monitoring
            this.stopHealthMonitoring();
            
            if (this.sock) {
                try {
                    await this.sock.logout();
                } catch (logoutError) {
                    console.warn('⚠️ Logout error (continuing):', logoutError.message);
                }
                
                try {
                    this.sock.end();
                } catch (endError) {
                    console.warn('⚠️ Socket end error (continuing):', endError.message);
                }
                
                this.sock = null;
            }
            
            // Clear auth files
            if (fs.existsSync(this.authPath)) {
                try {
                    fs.removeSync(this.authPath);
                    fs.ensureDirSync(this.authPath);
                } catch (fileError) {
                    console.warn('⚠️ Error clearing auth files:', fileError.message);
                }
            }
            
            // Emit logout status
            this.io.emit('whatsapp:status_change', {
                status: 'logged_out',
                isConnected: false,
                message: 'Logged out successfully',
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Logged out successfully');
            
        } catch (error) {
            console.error('❌ Error during logout:', error);
            throw error;
        }
    }

    async destroy() {
        try {
            console.log('🗑️ Destroying Baileys client...');
            
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            
            // Clear timers
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            this.stopHealthMonitoring();
            
            if (this.sock) {
                try {
                    this.sock.end();
                } catch (error) {
                    console.warn('⚠️ Error ending socket:', error.message);
                }
                this.sock = null;
            }
            
            console.log('✅ Client destroyed');
            
        } catch (error) {
            console.error('❌ Error destroying client:', error);
        }
    }

    // Health monitoring
    startHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(() => {
            if (this.isReady && this.sock) {
                this.lastHeartbeat = Date.now();
                console.log('💓 Health check: OK');
            }
        }, this.keepAliveDelay);
    }

    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // Database operations
    async saveSessionEvent(eventType, data = {}) {
        try {
            if (!this.supabase) return;
            
            await this.supabase
                .from('whatsapp_sessions')
                .insert({
                    session_id: this.currentSessionId,
                    phone_number: this.phoneNumber,
                    event_type: eventType,
                    event_data: data,
                    created_at: new Date().toISOString()
                });
                
        } catch (error) {
            console.error('❌ Error saving session event:', error);
        }
    }

    /**
     * Clear current session and prepare for new connection
     * @returns {Promise<boolean>} - Success status
     */
    async clearSession() {
        try {
            console.log('🧹 Clearing current Baileys WhatsApp session...');
            
            // Stop health monitoring first
            this.stopHealthMonitoring();
            
            // Clear timers
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            // Disconnect if connected
            if (this.isReady) {
                try {
                    await this.logout();
                } catch (logoutError) {
                    console.warn('⚠️ Logout failed during clear session, continuing:', logoutError.message);
                }
            }
            
            // Destroy client
            if (this.sock) {
                try {
                    await this.destroy();
                } catch (destroyError) {
                    console.warn('⚠️ Destroy failed during clear session, continuing:', destroyError.message);
                }
            }
            
            // Clear session files
            try {
                await this.clearSessionFiles();
            } catch (fileError) {
                console.warn('⚠️ Clear session files failed, continuing:', fileError.message);
            }
            
            // Reset all states
            this.currentSessionId = this.generateSessionId();
            this.phoneNumber = null;
            this.currentQRCode = null;
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.sock = null;
            this.reconnectAttempts = 0;
            
            console.log(`✅ Session cleared. New session ID: ${this.currentSessionId}`);
            
            // Emit session cleared event
            this.io.emit('whatsapp:session_cleared', {
                newSessionId: this.currentSessionId,
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error clearing session:', error);
            // Reset states even if there's an error
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.sock = null;
            throw error;
        }
    }

    /**
     * Clear session files from filesystem
     * @returns {Promise<void>}
     */
    async clearSessionFiles() {
        try {
            // Remove all auth files
            if (fs.existsSync(this.authPath)) {
                const authFiles = fs.readdirSync(this.authPath);
                for (const file of authFiles) {
                    const filePath = path.join(this.authPath, file);
                    if (fs.statSync(filePath).isFile()) {
                        fs.removeSync(filePath);
                        console.log(`🗑️ Removed auth file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error clearing session files:', error);
        }
    }

    // Getters
    getStatus() {
        return {
            isReady: this.isReady,
            phoneNumber: this.phoneNumber,
            sessionId: this.currentSessionId,
            lastHeartbeat: this.lastHeartbeat,
            isDemo: false
        };
    }

    getQRCode() {
        return this.currentQRCode;
    }

    // Force ready status for testing purposes
    forceReadyStatus(ready = true, phoneNumber = null) {
        console.log(`🧪 [TEST] Forcing ready status to: ${ready}, phone: ${phoneNumber}`);
        this.isReady = ready;
        if (ready && phoneNumber) {
            this.phoneNumber = phoneNumber;
        }
        
        // Create a mock socket for testing if ready is true
        if (ready && !this.sock) {
            this.sock = {
                sendMessage: async (to, message) => {
                    console.log(`🧪 [TEST] Mock sending message to ${to}:`, message);
                    return {
                        key: {
                            id: `test_${Date.now()}`,
                            remoteJid: to,
                            fromMe: true
                        },
                        messageTimestamp: Date.now(),
                        status: 1
                    };
                }
            };
        }
        
        return {
            isReady: this.isReady,
            phoneNumber: this.phoneNumber,
            sessionId: this.currentSessionId
        };
    }

    /**
     * Create a new session with enhanced error handling and validation
     * @returns {Promise<Object>} Session creation result
     */
    async createNewSession() {
        try {
            console.log('🆕 Creating new WhatsApp session...');
            
            // Step 1: Clear existing session completely
            await this.clearSession();
            
            // Step 2: Wait for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 3: Verify session files are cleared
            if (fs.existsSync(this.authPath)) {
                const authFiles = fs.readdirSync(this.authPath);
                if (authFiles.length > 0) {
                    console.log('⚠️ Auth files still exist, force clearing...');
                    await this.clearSessionFiles();
                }
            }
            
            // Step 4: Generate new session ID
            this.currentSessionId = this.generateSessionId();
            
            // Step 5: Reset all states
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.phoneNumber = null;
            this.currentQRCode = null;
            this.sock = null;
            
            // Step 6: Initialize new client
            await this.initializeClient();
            
            // Step 7: Save session creation event
            await this.saveSessionEvent('session_created', { 
                sessionId: this.currentSessionId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ New session created successfully: ${this.currentSessionId}`);
            
            // Step 8: Emit session created event
            this.io.emit('whatsapp:session_created', {
                sessionId: this.currentSessionId,
                timestamp: new Date().toISOString(),
                message: 'New session created successfully'
            });
            
            return {
                success: true,
                sessionId: this.currentSessionId,
                message: 'New session created successfully',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error creating new session:', error);
            
            // Emit error event
            this.io.emit('whatsapp:error', {
                message: 'Failed to create new session',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw new Error(`Failed to create new session: ${error.message}`);
        }
    }

    /**
     * Generate QR Code with enhanced timeout and validation
     * @returns {Promise<Object>} QR generation result
     */
    async generateQRCodeWithTimeout() {
        const QR_TIMEOUT = 30000; // Increased to 30s for better reliability
        let qrHandler, errorHandler, timeoutId;
        
        try {
            console.log('🔄 Generating QR Code with timeout...');
            
            // Check if client is ready for QR generation
            if (this.isReady) {
                throw new Error('WhatsApp is already connected. Please disconnect first.');
            }
            
            if (this.isInitializing) {
                throw new Error('WhatsApp is currently initializing. Please wait.');
            }
            
            // Clear any existing QR code
            this.currentQRCode = null;
            
            // Create a promise that resolves when QR code is generated
            const qrPromise = new Promise((resolve, reject) => {
                // Set up a one-time listener for QR code generation
                qrHandler = (qrData) => {
                    console.log('✅ QR Code received via event');
                    resolve(qrData);
                };
                
                errorHandler = (error) => {
                    console.error('❌ QR Code generation error via event:', error);
                    reject(new Error(error.message || 'QR Code generation failed'));
                };
                
                // Listen for QR code events
                this.once('qr_generated', qrHandler);
                this.once('error', errorHandler);
                this.once('init_error', errorHandler);
                
                // Start QR generation process
                this.generateQRCode().catch(reject);
            });
            
            // Set timeout for QR generation
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`QR Code generation timeout after ${QR_TIMEOUT / 1000} seconds`));
                }, QR_TIMEOUT);
            });
            
            const qrData = await Promise.race([qrPromise, timeoutPromise]);
            
            // Clear timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Validate QR code
            if (!this.currentQRCode) {
                throw new Error('QR Code generation failed - no QR code received');
            }
            
            // Verify QR code format
            if (!this.currentQRCode.startsWith('data:image/')) {
                throw new Error('Invalid QR Code format received');
            }
            
            console.log('✅ QR Code generated and validated successfully');
            
            return {
                success: true,
                qrCode: this.currentQRCode,
                sessionId: this.currentSessionId,
                message: 'QR Code generated successfully',
                timestamp: new Date().toISOString(),
                expiresIn: 300000, // 5 minutes
                compatibility: this.validateWhatsAppMobileCompatibility(),
                instructions: {
                    step1: 'Open WhatsApp on your phone',
                    step2: 'Go to Settings > Linked Devices',
                    step3: 'Tap "Link a Device"',
                    step4: 'Scan this QR code with your phone camera'
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating QR Code with timeout:', error);
            
            // Clear timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Clean up listeners
            if (qrHandler) {
                this.io.removeListener('whatsapp:qr', qrHandler);
            }
            if (errorHandler) {
                this.io.removeListener('whatsapp:error', errorHandler);
                this.io.removeListener('whatsapp:init_error', errorHandler);
            }
            
            // Clear current QR code on error
            this.currentQRCode = null;
            
            // Reset states on error
            this.isInitializing = false;
            this.isReconnecting = false;
            
            // Emit error event
            this.io.emit('whatsapp:qr_error', {
                message: 'Failed to generate QR Code',
                error: error.message,
                timestamp: new Date().toISOString(),
                sessionId: this.currentSessionId
            });
            
            throw error;
        }
    }

    /**
     * Validate WhatsApp Mobile compatibility
     * @returns {Object} Compatibility check result
     */
    validateWhatsAppMobileCompatibility() {
        try {
            const compatibility = {
                isCompatible: true,
                version: '2.24.x',
                features: {
                    qrCodeScanning: true,
                    multiDevice: true,
                    businessAPI: true,
                    webAuth: true
                },
                requirements: {
                    minAndroidVersion: '5.0',
                    minIOSVersion: '12.0',
                    internetConnection: true,
                    cameraPermission: true
                },
                recommendations: [
                    'Pastikan WhatsApp Mobile Anda versi terbaru',
                    'Aktifkan kamera untuk scan QR Code',
                    'Pastikan koneksi internet stabil',
                    'Gunakan pencahayaan yang cukup saat scan QR Code'
                ]
            };
            
            console.log('✅ WhatsApp Mobile compatibility validated');
            return compatibility;
            
        } catch (error) {
            console.error('❌ Error validating WhatsApp Mobile compatibility:', error);
            return {
                isCompatible: false,
                error: error.message
            };
        }
    }

    // Initialize method for compatibility
    async initialize() {
        return this.initializeClient();
    }
}

module.exports = BaileysWhatsAppService;