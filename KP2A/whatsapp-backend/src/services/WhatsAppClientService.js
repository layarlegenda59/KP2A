const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class WhatsAppClientService extends EventEmitter {
    constructor(io, supabaseClient) {
        super();
        this.io = io;
        this.supabase = supabaseClient;
        this.client = null;
        this.isReady = false;
        this.isInitializing = false;
        this.sessionPath = path.join(__dirname, '../../sessions');
        this.currentSessionId = this.generateSessionId(); // Dynamic session ID
        this.phoneNumber = null;
        this.currentQRCode = null;
        this.messageHandler = null; // New message handler integration
        this.isDemoMode = false; // Demo mode flag
        
        // Anti-loop protection
        this.processedMessages = new Set(); // Track processed message IDs
        this.isProcessingMessage = false; // Processing lock
        this.lastResponseTime = 0; // Rate limiting
        this.RATE_LIMIT_DELAY = 2000; // 2 seconds between responses
        this.MESSAGE_CLEANUP_INTERVAL = 300000; // Clean old message IDs every 5 minutes
        
        // Auto-reconnect configuration
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 30000; // 30 seconds
        this.isReconnecting = false;
        this.reconnectTimer = null;

        // Keep-alive configuration
        this.keepAliveInterval = null;
        this.keepAliveDelay = 60000; // 1 minute
        this.lastHeartbeat = Date.now();

        // Health monitoring
        this.healthCheckInterval = null;
        this.healthCheckDelay = 300000; // 5 minutes
        
        // Start cleanup interval for processed messages
        setInterval(() => {
            this.processedMessages.clear();
            console.log('🧹 Cleared processed messages cache');
        }, this.MESSAGE_CLEANUP_INTERVAL);
        
        // Start health monitoring
        this.startHealthMonitoring();

        // Start periodic session backup
        this.periodicSessionBackup();
        
        this.initializeClient();
    }

    /**
     * Generate a unique session ID for dynamic session management
     * @returns {string} - Unique session ID
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `sidarsih-session-${timestamp}-${random}`;
    }

    /**
     * Clear current session and prepare for new connection
     * @returns {Promise<boolean>} - Success status
     */
    async clearSession() {
        try {
            console.log('🧹 Clearing current WhatsApp session...');
            
            // Stop health monitoring first
            this.stopHealthMonitoring();
            
            // Disconnect if connected
            if (this.isReady || this.isDemoMode) {
                try {
                    await this.logout();
                } catch (logoutError) {
                    console.warn('⚠️ Logout failed during clear session, continuing:', logoutError.message);
                }
            }
            
            // Destroy client
            if (this.client) {
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
            this.isDemoMode = false;
            this.client = null;
            
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
            this.isDemoMode = false;
            this.client = null;
            throw error;
        }
    }

    /**
     * Clear session files from filesystem
     * @returns {Promise<void>}
     */
    async clearSessionFiles() {
        try {
            // Remove all session directories
            if (fs.existsSync(this.sessionPath)) {
                const sessionDirs = fs.readdirSync(this.sessionPath);
                for (const dir of sessionDirs) {
                    const dirPath = path.join(this.sessionPath, dir);
                    if (fs.statSync(dirPath).isDirectory()) {
                        fs.removeSync(dirPath);
                        console.log(`🗑️ Removed session directory: ${dir}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error clearing session files:', error);
        }
    }

    /**
     * Set the message handler service for processing incoming messages
     * @param {MessageHandlerService} messageHandler - The message handler service
     */
    setMessageHandler(messageHandler) {
        this.messageHandler = messageHandler;
        console.log('✅ Message handler integrated with WhatsApp client');
    }

    initializeClient() {
        try {
            // Ensure session directory exists
            fs.ensureDirSync(this.sessionPath);

            // Try to find available browser executable
            const os = require('os');
            const { execSync } = require('child_process');
            
            let executablePath = null;
            
            // Try different browser paths
            const browserPaths = [
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/usr/bin/google-chrome',
                '/usr/bin/chrome',
                '/snap/bin/chromium',
                path.join(os.homedir(), '.cache/puppeteer/chrome/linux-141.0.7390.76/chrome-linux64/chrome')
            ];
            
            for (const browserPath of browserPaths) {
                try {
                    if (fs.existsSync(browserPath)) {
                        executablePath = browserPath;
                        console.log(`✅ Found browser at: ${browserPath}`);
                        break;
                    }
                } catch (error) {
                    // Continue to next path
                }
            }
            
            if (!executablePath) {
                console.log('⚠️ No browser found, using default Puppeteer browser');
            }

            // Initialize WhatsApp client with local authentication
            const clientConfig = {
                authStrategy: new LocalAuth({
                    clientId: this.currentSessionId,
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    timeout: 60000,
                    protocolTimeout: 60000
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2413.51.html',
                },
                webVersion: '2.2413.51',
                authTimeoutMs: 60000,
                qrMaxRetries: 5
            };
            
            // Add executablePath only if found
            if (executablePath) {
                clientConfig.puppeteer.executablePath = executablePath;
            }

            this.client = new Client(clientConfig);
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ Error initializing WhatsApp client:', error);
            this.emit('error', error);
        }
    }

    setupEventHandlers() {
        // QR Code event
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code received');
            
            try {
                // Generate QR code as data URL
                const qrDataUrl = await qrcode.toDataURL(qr);
                
                // Store current QR code
                this.currentQRCode = qrDataUrl;
                
                // Emit to frontend via Socket.IO
                this.io.emit('whatsapp:qr', {
                    qr: qrDataUrl,
                    timestamp: new Date().toISOString()
                });

                // Save QR to database
                await this.saveSessionEvent('qr_generated', { qr });
                
                console.log('✅ QR Code generated and sent to frontend');
                
            } catch (error) {
                console.error('❌ Error generating QR code:', error);
                this.io.emit('whatsapp:error', { 
                    message: 'Failed to generate QR code',
                    error: error.message 
                });
            }
        });

        // Authentication event - fired when QR code is scanned
        this.client.on('authenticated', async (session) => {
            console.log('🔐 WhatsApp client authenticated successfully');
            
            try {
                // Emit authentication status to frontend
                this.io.emit('whatsapp:authenticated', {
                    timestamp: new Date().toISOString(),
                    message: 'Authentication successful, initializing...'
                });

                // Save authentication event
                await this.saveSessionEvent('authenticated', { session: session ? 'present' : 'none' });
                
                console.log('✅ Authentication event processed');
                
            } catch (error) {
                console.error('❌ Error in authenticated event:', error);
            }
        });

        // Ready event - fired when client is fully ready
        this.client.on('ready', async () => {
            console.log('🚀 WhatsApp client is ready!');
            this.isReady = true;
            this.isInitializing = false;
            this.isReconnecting = false;

            // Reset reconnect attempts on successful connection
            this.reconnectAttempts = 0;

            try {
                const clientInfo = this.client.info;
                this.phoneNumber = clientInfo ? clientInfo.wid.user : 'unknown';
                
                // Log successful connection
                await this.logConnectionEvent('client_ready', `WhatsApp client ready for: ${this.phoneNumber}`, { 
                    phoneNumber: this.phoneNumber,
                    clientName: clientInfo ? clientInfo.pushname : 'WhatsApp User'
                });
                
                // Emit ready status to frontend with proper status structure
                this.io.emit('whatsapp:ready', {
                    status: 'ready',
                    isConnected: true,
                    phoneNumber: this.phoneNumber,
                    clientName: clientInfo ? clientInfo.pushname : 'WhatsApp User',
                    timestamp: new Date().toISOString()
                });

                // Also emit status change for compatibility
                this.io.emit('whatsapp:status_change', {
                    status: 'ready',
                    isConnected: true,
                    phoneNumber: this.phoneNumber,
                    message: 'WhatsApp connected successfully',
                    timestamp: new Date().toISOString()
                });

                // Save session to database
                if (clientInfo) {
                    await this.saveSession(clientInfo);
                }
                
                // Load contacts
                await this.loadContacts();
                
                console.log(`✅ WhatsApp ready for: ${this.phoneNumber}`);
                
            } catch (error) {
                console.error('❌ Error in ready event:', error);
                await this.logConnectionEvent('ready_event_error', `Error in ready event: ${error.message}`, { error });
                
                // Still emit ready event even if there's an error
                this.io.emit('whatsapp:ready', {
                    status: 'ready',
                    isConnected: true,
                    phoneNumber: 'unknown',
                    clientName: 'WhatsApp User',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Message received event
        this.client.on('message', async (message) => {
            const messageId = message.id._serialized;
            console.log(`📨 Message received: ${message.body} (ID: ${messageId})`);
            
            try {
                // COMPREHENSIVE ANTI-LOOP PROTECTION
                
                // 1. Check if message is from bot itself
                if (message.fromMe) {
                    console.log('🚫 Skipping message from self to prevent loop');
                    return;
                }

                // 2. Check if message was already processed (deduplication)
                if (this.processedMessages.has(messageId)) {
                    console.log(`🚫 Message already processed: ${messageId}`);
                    return;
                }

                // 3. Check if another message is currently being processed (processing lock)
                if (this.isProcessingMessage) {
                    console.log('🚫 Another message is being processed, skipping to prevent concurrent processing');
                    return;
                }

                // 4. Rate limiting check
                const now = Date.now();
                if (now - this.lastResponseTime < this.RATE_LIMIT_DELAY) {
                    console.log(`🚫 Rate limit active, skipping message (${this.RATE_LIMIT_DELAY}ms delay)`);
                    return;
                }

                // 5. Skip empty messages
                if (!message.body || message.body.trim() === '') {
                    console.log('🚫 Skipping empty message');
                    return;
                }

                // 6. Skip status broadcasts
                if (message.from === 'status@broadcast') {
                    console.log('🚫 Skipping status broadcast');
                    return;
                }

                // 7. Skip group messages (optional - uncomment if needed)
                // if (message.from.includes('@g.us')) {
                //     console.log('🚫 Skipping group message');
                //     return;
                // }

                // Mark message as processed and set processing lock
                this.processedMessages.add(messageId);
                this.isProcessingMessage = true;
                
                console.log(`✅ Processing message: ${message.body}`);
                
                // Save message to database
                await this.saveMessage(message);
                
                // Emit to frontend
                this.io.emit('whatsapp:message', {
                    id: messageId,
                    from: message.from,
                    to: message.to,
                    body: message.body,
                    timestamp: message.timestamp,
                    type: message.type,
                    isGroup: message.from.includes('@g.us')
                });

                // Use new message handler if available, otherwise fallback to old auto-reply
                if (this.messageHandler) {
                    await this.messageHandler.processMessage(message, this.client);
                } else {
                    // Fallback to old auto-reply system
                    await this.processAutoReply(message);
                }

                // Update last response time for rate limiting
                this.lastResponseTime = Date.now();
                
                console.log(`✅ Message processed successfully: ${messageId}`);
                
            } catch (error) {
                console.error('❌ Error processing message:', error);
            } finally {
                // Always release processing lock
                this.isProcessingMessage = false;
            }
        });

        // Message sent event
        this.client.on('message_create', async (message) => {
            if (message.fromMe) {
                try {
                    await this.saveMessage(message, 'outbound');
                    
                    this.io.emit('whatsapp:message_sent', {
                        id: message.id._serialized,
                        to: message.to,
                        body: message.body,
                        timestamp: message.timestamp,
                        type: message.type
                    });
                } catch (error) {
                    console.error('Error processing sent message:', error);
                }
            }
        });

        // Disconnected event
        this.client.on('disconnected', async (reason) => {
            console.log('🔌 WhatsApp client disconnected:', reason);
            this.isReady = false;
            this.isInitializing = false;
            this.phoneNumber = null;
            
            this.io.emit('whatsapp:disconnected', {
                reason,
                timestamp: new Date().toISOString()
            });

            await this.saveSessionEvent('disconnected', { reason });
            await this.updateSessionStatus('disconnected');
            await this.logConnectionEvent('disconnected', `Client disconnected: ${reason}`, { reason });

            // Trigger auto-reconnect if not already reconnecting
            if (!this.isReconnecting) {
                console.log('🔄 Triggering auto-reconnect due to disconnection...');
                setTimeout(() => {
                    this.attemptReconnect();
                }, 5000); // Wait 5 seconds before attempting reconnect
            }
        });

        // Authentication failure
        this.client.on('auth_failure', async (message) => {
            console.error('🔐❌ Authentication failure:', message);
            this.isReady = false;
            this.isInitializing = false;
            
            this.io.emit('whatsapp:auth_failure', {
                message,
                timestamp: new Date().toISOString()
            });

            await this.saveSessionEvent('auth_failure', { message });
            await this.logConnectionEvent('auth_failure', `Authentication failed: ${message}`, { message });

            // Clear session and attempt reconnect after auth failure
            if (!this.isReconnecting) {
                console.log('🔄 Clearing session and attempting reconnect after auth failure...');
                setTimeout(async () => {
                    try {
                        await this.clearSession();
                        await this.attemptReconnect();
                    } catch (error) {
                        console.error('Error during auth failure recovery:', error);
                    }
                }, 10000); // Wait 10 seconds before clearing session and reconnecting
            }
        });

        // General error handler
        this.client.on('error', async (error) => {
            console.error('❌ WhatsApp client error:', error);
            this.isInitializing = false;
            
            this.io.emit('whatsapp:error', {
                message: 'WhatsApp client error occurred',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            await this.saveSessionEvent('error', { error: error.message });
            await this.logConnectionEvent('client_error', `Client error: ${error.message}`, { error });

            // Attempt reconnect for critical errors
            const criticalErrors = ['CONFLICT', 'UNPAIRED', 'TIMEOUT', 'PROTOCOL_ERROR'];
            const isCriticalError = criticalErrors.some(criticalError => 
                error.message.toUpperCase().includes(criticalError)
            );

            if (isCriticalError && !this.isReconnecting) {
                console.log('🔄 Critical error detected, attempting reconnect...');
                setTimeout(() => {
                    this.attemptReconnect();
                }, 15000); // Wait 15 seconds before attempting reconnect
            }
        });

        // Loading screen event
        this.client.on('loading_screen', (percent, message) => {
            console.log(`Loading: ${percent}% - ${message}`);
            
            this.io.emit('whatsapp:loading', {
                percent,
                message,
                timestamp: new Date().toISOString()
            });
        });

        // Change state event
        this.client.on('change_state', (state) => {
            console.log('🔄 WhatsApp state changed:', state);
            
            this.io.emit('whatsapp:state_change', {
                state,
                timestamp: new Date().toISOString()
            });
        });
    }

    async initialize() {
        try {
            // Check if client is already initializing or ready
            if (this.isInitializing || this.isReady) {
                console.log('⚠️ WhatsApp client already initializing or ready, skipping...');
                return;
            }

            this.isInitializing = true;
            console.log('🚀 Initializing WhatsApp client...');
            
            // Emit initialization status
            this.io.emit('whatsapp:status_change', {
                status: 'initializing',
                isConnected: false,
                message: 'Initializing WhatsApp client...',
                timestamp: new Date().toISOString()
            });
            
            // Add timeout for initialization with better error handling
            const initPromise = this.client.initialize();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('WhatsApp client initialization timeout after 90 seconds'));
                }, 90000); // 90 seconds timeout (increased for better stability)
            });

            await Promise.race([initPromise, timeoutPromise]);
            
            console.log('✅ WhatsApp client initialization completed');
            
        } catch (error) {
            console.error('❌ Failed to initialize WhatsApp client:', error);
            this.isInitializing = false;
            
            // Check if error is related to browser dependencies
            const isBrowserError = error.message.includes('libatk') || 
                                 error.message.includes('chrome') || 
                                 error.message.includes('chromium') ||
                                 error.message.includes('shared object file') ||
                                 error.message.includes('puppeteer');
            
            if (isBrowserError) {
                console.log('🎭 Browser dependency error detected, activating demo mode...');
                await this._activateDemoMode();
                return; // Don't throw error, demo mode is activated
            }
            
            // Emit error status for non-browser errors
            this.io.emit('whatsapp:error', {
                message: 'Failed to initialize WhatsApp client',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            this.io.emit('whatsapp:status_change', {
                status: 'error',
                isConnected: false,
                message: `Initialization failed: ${error.message}`,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    async generateQRCode() {
        try {
            console.log('📱 Starting QR code generation...');
            
            // Check if browser is available first
            if (!this.isBrowserAvailable()) {
                console.log('🖥️ Browser not available, using demo mode');
                await this._generateDemoQRCode();
                return;
            }
            
            // Emit status
            this.io.emit('whatsapp:status', {
                status: 'generating_qr',
                message: 'Generating QR code...',
                timestamp: new Date().toISOString()
            });

            // Set timeout for QR generation
            const qrPromise = this._performQRGeneration();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('QR generation timeout')), 90000)
            );
            
            await Promise.race([qrPromise, timeoutPromise]);
            
        } catch (error) {
            console.error('❌ QR code generation failed:', error);
            
            // Fallback to demo mode on any error
            console.log('🎭 Falling back to demo mode due to QR generation error');
            await this._generateDemoQRCode();
        }
    }

    async _performQRGeneration() {
        // If already connected, disconnect first
        if (this.isReady) {
            console.log('WhatsApp already connected, disconnecting first...');
            await this.logout();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }

        // Clear current QR code
        this.currentQRCode = null;
        
        // Destroy existing client if any
        if (this.client) {
            await this.destroy();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Reinitialize client
        this.initializeClient();
        
        // Initialize to trigger QR generation
        await this.initialize();
    }

    async sendMessage(to, message, options = {}) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            console.log(`📤 Sending message to ${to}: ${message.substring(0, 50)}...`);
            
            // Rate limiting for outgoing messages
            const now = Date.now();
            if (now - this.lastResponseTime < this.RATE_LIMIT_DELAY) {
                const waitTime = this.RATE_LIMIT_DELAY - (now - this.lastResponseTime);
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            // Clean phone number format
            const cleanTo = to.replace(/[^\d]/g, '');
            const chatId = cleanTo.includes('@') ? cleanTo : `${cleanTo}@c.us`;

            let sentMessage;
            
            if (options.media) {
                // Send media message
                const media = MessageMedia.fromFilePath(options.media);
                sentMessage = await this.client.sendMessage(chatId, media, { caption: message });
            } else {
                // Send text message
                sentMessage = await this.client.sendMessage(chatId, message);
            }

            // Update last response time
            this.lastResponseTime = Date.now();

            // Save to database
            await this.saveOutgoingMessage(sentMessage, to, message, options);

            console.log(`✅ Message sent successfully to ${to}`);

            return {
                success: true,
                messageId: sentMessage.id._serialized,
                timestamp: sentMessage.timestamp
            };

        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    async getContacts() {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            const contacts = await this.client.getContacts();
            const chats = await this.client.getChats();

            // Process contacts
            const processedContacts = contacts.map(contact => ({
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number,
                number: contact.number,
                isGroup: contact.isGroup,
                isBusiness: contact.isBusiness,
                profilePicUrl: contact.profilePicUrl
            }));

            // Process chats (groups)
            const groups = chats.filter(chat => chat.isGroup).map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: true,
                participants: chat.participants?.length || 0
            }));

            return {
                contacts: processedContacts,
                groups: groups,
                totalCount: processedContacts.length + groups.length
            };

        } catch (error) {
            console.error('Error getting contacts:', error);
            throw new Error(`Failed to get contacts: ${error.message}`);
        }
    }

    async getStatus() {
        return {
            connected: this.isReady,
            phoneNumber: this.phoneNumber,
            sessionId: this.currentSessionId,
            lastSeen: new Date().toISOString()
        };
    }

    async logout() {
        try {
            console.log('🚪 Attempting to logout...');
            
            // Handle demo mode
            if (this.isDemoMode) {
                console.log('🎭 Demo mode logout - skipping client logout');
                this.isReady = false;
                this.phoneNumber = null;
                this.isDemoMode = false;
                
                await this.updateSessionStatus('disconnected');
                
                this.io.emit('whatsapp:logout', {
                    timestamp: new Date().toISOString(),
                    isDemo: true
                });
                
                return { success: true };
            }
            
            // Handle real client logout
            if (this.client && typeof this.client.logout === 'function') {
                try {
                    await this.client.logout();
                    console.log('✅ Client logout successful');
                } catch (clientError) {
                    console.warn('⚠️ Client logout failed, but continuing:', clientError.message);
                }
            }
            
            await this.updateSessionStatus('disconnected');
            this.isReady = false;
            this.phoneNumber = null;
            
            this.io.emit('whatsapp:logout', {
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Logout completed successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Error during logout:', error);
            throw new Error(`Failed to logout: ${error.message}`);
        }
    }

    async destroy() {
        try {
            console.log('🔥 Destroying WhatsApp client...');
            
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.isDemoMode = false;

            // Stop health monitoring
            this.stopHealthMonitoring();
            
            if (this.client && typeof this.client.destroy === 'function') {
                try {
                    await this.client.destroy();
                    console.log('✅ Client destroyed successfully');
                } catch (destroyError) {
                    console.warn('⚠️ Client destroy failed, but continuing:', destroyError.message);
                }
            }
            
            this.client = null;
            this.phoneNumber = null;
            this.currentQRCode = null;

            await this.logConnectionEvent('client_destroyed', 'WhatsApp client destroyed');
            
            console.log('✅ WhatsApp client destroyed successfully');
            
        } catch (error) {
            console.error('❌ Error destroying WhatsApp client:', error);
            // Force cleanup even if destroy fails
            this.client = null;
            this.isReady = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.isDemoMode = false;
            this.phoneNumber = null;
            this.currentQRCode = null;
            
            await this.logConnectionEvent('destroy_error', `Error destroying client: ${error.message}`, { error });
        }
    }

    // Database operations
    async saveSession(clientInfo) {
        try {
            const sessionData = {
                session_id: this.currentSessionId,
                phone_number: clientInfo.wid.user,
                client_name: clientInfo.pushname,
                status: 'connected',
                is_active: true,
                connected_at: new Date().toISOString(),
                session_data: {
                    wid: clientInfo.wid,
                    pushname: clientInfo.pushname,
                    platform: clientInfo.platform
                }
            };

            const { data, error } = await this.supabase
                .from('whatsapp_sessions')
                .upsert(sessionData, { 
                    onConflict: 'session_id',
                    returning: 'minimal'
                });

            if (error) {
                console.error('Error saving session:', error);
            } else {
                console.log(`Session saved successfully with ID: ${this.currentSessionId}`);
            }

        } catch (error) {
            console.error('Error in saveSession:', error);
        }
    }

    async updateSessionStatus(status) {
        try {
            const { error } = await this.supabase
                .from('whatsapp_sessions')
                .update({ 
                    status,
                    is_active: status === 'connected',
                    updated_at: new Date().toISOString()
                })
                .eq('session_id', 'sidarsih-cimahi');

            if (error) {
                console.error('Error updating session status:', error);
            }
        } catch (error) {
            console.error('Error in updateSessionStatus:', error);
        }
    }

    async saveMessage(message, direction = 'inbound') {
        try {
            // Extract phone numbers properly
            const fromPhone = message.from ? message.from.replace('@c.us', '').replace('@g.us', '') : '';
            const toPhone = message.to ? message.to.replace('@c.us', '').replace('@g.us', '') : (this.phoneNumber || '');
            
            const messageData = {
                message_id: message.id._serialized,
                from_number: message.from,
                to_number: message.to || this.phoneNumber + '@c.us',
                content: message.body,
                message_type: message.type,
                direction: direction,
                timestamp: message.timestamp,
                status: 'received',
                // Add the required fields for the actual table structure
                sender_phone: direction === 'inbound' ? fromPhone : toPhone,
                receiver_phone: direction === 'inbound' ? toPhone : fromPhone,
                message_content: message.body || '',
                is_incoming: direction === 'inbound',
                session_id: this.currentSessionId,
                metadata: {
                    hasMedia: message.hasMedia,
                    isForwarded: message.isForwarded,
                    isGroup: message.from.includes('@g.us'),
                    deviceType: message.deviceType
                }
            };

            const { error } = await this.supabase
                .from('whatsapp_messages')
                .insert(messageData);

            if (error) {
                console.error('Error saving message:', error);
                // Log error for debugging
                await this.logConnectionEvent('message_save_error', `Failed to save message: ${error.message}`, { error, messageData });
            }

        } catch (error) {
            console.error('Error in saveMessage:', error);
            await this.logConnectionEvent('message_save_exception', `Exception in saveMessage: ${error.message}`, { error });
        }
    }

    async saveOutgoingMessage(sentMessage, to, content, options) {
        try {
            // Extract phone numbers properly
            const fromPhone = this.phoneNumber || '';
            const toPhone = to ? to.replace('@c.us', '').replace('@g.us', '') : '';
            
            const messageData = {
                message_id: sentMessage.id._serialized,
                from_number: this.phoneNumber + '@c.us',
                to_number: to,
                content: content,
                message_type: options.media ? 'media' : 'text',
                direction: 'outbound',
                timestamp: sentMessage.timestamp,
                status: 'sent',
                // Add the required fields for the actual table structure
                sender_phone: fromPhone,
                receiver_phone: toPhone,
                message_content: content || '',
                is_incoming: false,
                session_id: this.currentSessionId,
                metadata: {
                    hasMedia: !!options.media,
                    mediaUrl: options.media || null
                }
            };

            const { error } = await this.supabase
                .from('whatsapp_messages')
                .insert(messageData);

            if (error) {
                console.error('Error saving outgoing message:', error);
                await this.logConnectionEvent('outgoing_message_save_error', `Failed to save outgoing message: ${error.message}`, { error, messageData });
            }

        } catch (error) {
            console.error('Error in saveOutgoingMessage:', error);
            await this.logConnectionEvent('outgoing_message_save_exception', `Exception in saveOutgoingMessage: ${error.message}`, { error });
        }
    }

    async saveSessionEvent(eventType, eventData) {
        try {
            const { error } = await this.supabase
                .from('whatsapp_session_events')
                .insert({
                    session_id: this.currentSessionId,
                    event_type: eventType,
                    event_data: eventData
                });

            if (error) {
                console.error('Error saving session event:', error);
            }

        } catch (error) {
            console.error('Error in saveSessionEvent:', error);
        }
    }

    async logConnectionEvent(eventType, eventMessage, errorDetails = null) {
        try {
            const { error } = await this.supabase
                .from('whatsapp_connection_logs')
                .insert({
                    session_id: this.currentSessionId,
                    event_type: eventType,
                    event_message: eventMessage,
                    error_details: errorDetails,
                    connection_status: this.isReady ? 'connected' : 'disconnected'
                });

            if (error) {
                console.error('Error logging connection event:', error);
            }

        } catch (error) {
            console.error('Error in logConnectionEvent:', error);
        }
    }

    async recordHealthCheck(checkType, status, details = null, responseTime = null) {
        try {
            const { error } = await this.supabase
                .from('whatsapp_health_checks')
                .insert({
                    check_type: checkType,
                    status: status,
                    details: details,
                    response_time_ms: responseTime
                });

            if (error) {
                console.error('Error recording health check:', error);
            }

        } catch (error) {
            console.error('Error in recordHealthCheck:', error);
        }
    }

    startHealthMonitoring() {
        console.log('🏥 Starting health monitoring...');
        
        // Health check every 5 minutes
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, this.healthCheckDelay);

        // Keep-alive heartbeat every minute
        this.keepAliveInterval = setInterval(async () => {
            await this.sendKeepAlive();
        }, this.keepAliveDelay);
    }

    async performHealthCheck() {
        const startTime = Date.now();
        let status = 'healthy';
        let details = {};

        try {
            // Check if client exists and is ready
            if (!this.client || !this.isReady) {
                status = 'unhealthy';
                details.reason = 'Client not ready';
                
                // Only attempt reconnect if we're not already reconnecting and haven't exceeded max attempts
                if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
                    console.log('🔄 Health check failed - initiating reconnect...');
                    // Use setTimeout to prevent blocking the health check
                    setTimeout(() => {
                        this.attemptReconnect();
                    }, 1000);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.log('⚠️ Max reconnect attempts reached, switching to demo mode');
                    // Switch to demo mode instead of continuing to crash
                    await this._activateDemoMode();
                }
            } else {
                // Test client state with timeout
                try {
                    const statePromise = this.client.getState();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('State check timeout')), 5000)
                    );
                    
                    const state = await Promise.race([statePromise, timeoutPromise]);
                    details.clientState = state;
                    
                    if (state !== 'CONNECTED') {
                        status = 'degraded';
                        details.reason = `Client state: ${state}`;
                    }
                } catch (error) {
                    status = 'unhealthy';
                    details.reason = 'Failed to get client state';
                    details.error = error.message;
                    
                    // If client state check fails, it might be a browser issue
                    if (!this.isBrowserAvailable()) {
                        console.log('🖥️ Browser not available, switching to demo mode');
                        await this._activateDemoMode();
                        return;
                    }
                }
            }

            const responseTime = Date.now() - startTime;
            await this.recordHealthCheck('periodic_check', status, details, responseTime);
            
            console.log(`🏥 Health check: ${status} (${responseTime}ms)`);

        } catch (error) {
            console.error('Error in health check:', error);
            await this.recordHealthCheck('periodic_check', 'error', { error: error.message }, Date.now() - startTime);
            
            // If health check itself fails, consider demo mode
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                await this._activateDemoMode();
            }
        }
    }

    async sendKeepAlive() {
        try {
            if (this.client && this.isReady) {
                this.lastHeartbeat = Date.now();
                
                // Send a simple ping to keep connection alive
                try {
                    await this.client.getState();
                    console.log('💓 Keep-alive heartbeat sent');
                } catch (error) {
                    console.log('💔 Keep-alive failed:', error.message);
                    await this.logConnectionEvent('keep_alive_failed', `Keep-alive failed: ${error.message}`, { error });
                    
                    if (!this.isReconnecting) {
                        await this.attemptReconnect();
                    }
                }
            }
        } catch (error) {
            console.error('Error in keep-alive:', error);
        }
    }

    async attemptReconnect() {
        if (this.isReconnecting) {
            console.log('🔄 Reconnect already in progress...');
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnect attempts reached. Switching to demo mode.');
            await this.logConnectionEvent('max_reconnect_attempts', 'Maximum reconnect attempts reached, activating demo mode', { attempts: this.reconnectAttempts });
            await this._activateDemoMode();
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        await this.logConnectionEvent('reconnect_attempt', `Reconnect attempt ${this.reconnectAttempts}`, { attempt: this.reconnectAttempts });

        try {
            // Check browser availability first
            if (!this.isBrowserAvailable()) {
                console.log('🖥️ Browser not available, switching to demo mode');
                await this._activateDemoMode();
                this.isReconnecting = false;
                return;
            }

            // Safely destroy current client if exists
            if (this.client) {
                try {
                    if (typeof this.client.destroy === 'function') {
                        await this.client.destroy();
                    }
                } catch (error) {
                    console.log('⚠️ Error destroying client during reconnect (non-critical):', error.message);
                }
                this.client = null;
            }

            this.isReady = false;
            this.isInitializing = false;

            // Wait before reconnecting with exponential backoff
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds
            console.log(`⏳ Waiting ${delay}ms before reconnect...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Try to recover session first
            const sessionRecovered = await this.recoverSession();
            if (sessionRecovered) {
                console.log('📱 Session recovered, reinitializing client...');
            }

            // Reinitialize client with timeout
            const initPromise = this.initializeClient();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Initialization timeout')), 60000) // 60 second timeout
            );
            
            await Promise.race([initPromise, timeoutPromise]);

            console.log('✅ Reconnect successful!');
            await this.logConnectionEvent('reconnect_success', 'Successfully reconnected', { attempt: this.reconnectAttempts });
            
            // Reset reconnect attempts on success
            this.reconnectAttempts = 0;

        } catch (error) {
            console.error('❌ Reconnect failed:', error);
            await this.logConnectionEvent('reconnect_failed', `Reconnect failed: ${error.message}`, { error, attempt: this.reconnectAttempts });

            // If we've reached max attempts, switch to demo mode
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.log('🎭 Switching to demo mode after max reconnect attempts');
                await this._activateDemoMode();
            } else {
                // Schedule next reconnect attempt with exponential backoff
                const nextDelay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
                console.log(`⏳ Scheduling next reconnect in ${nextDelay}ms...`);
                this.reconnectTimer = setTimeout(() => {
                    this.isReconnecting = false;
                    this.attemptReconnect();
                }, nextDelay);
            }
        }

        this.isReconnecting = false;
    }

    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        console.log('🏥 Health monitoring stopped');
    }

    async recoverSession() {
        try {
            console.log('🔄 Attempting session recovery...');
            
            // Get the latest active session from database
            const { data: sessions, error } = await this.supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('is_active', true)
                .order('connected_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching session data:', error);
                return false;
            }

            if (sessions && sessions.length > 0) {
                const sessionData = sessions[0];
                console.log(`📱 Found active session: ${sessionData.phone_number}`);
                
                // Restore session properties
                this.currentSessionId = sessionData.session_id;
                this.phoneNumber = sessionData.phone_number;
                
                await this.logConnectionEvent('session_recovery_attempt', 'Attempting to recover session', { 
                    sessionId: this.currentSessionId,
                    phoneNumber: this.phoneNumber 
                });

                return true;
            } else {
                console.log('📱 No active session found for recovery');
                return false;
            }

        } catch (error) {
            console.error('❌ Error during session recovery:', error);
            await this.logConnectionEvent('session_recovery_error', `Session recovery failed: ${error.message}`, { error });
            return false;
        }
    }

    async backupSessionData() {
        try {
            if (!this.client || !this.isReady) {
                return;
            }

            const backupData = {
                session_id: this.currentSessionId,
                phone_number: this.phoneNumber,
                backup_timestamp: new Date().toISOString(),
                client_state: await this.client.getState(),
                backup_data: {
                    isReady: this.isReady,
                    lastHeartbeat: this.lastHeartbeat,
                    reconnectAttempts: this.reconnectAttempts
                }
            };

            // Save backup to session events
            await this.saveSessionEvent('session_backup', backupData);
            
            console.log('💾 Session data backed up successfully');

        } catch (error) {
            console.error('❌ Error backing up session data:', error);
            await this.logConnectionEvent('session_backup_error', `Session backup failed: ${error.message}`, { error });
        }
    }

    async periodicSessionBackup() {
        // Backup session data every 10 minutes
        setInterval(async () => {
            if (this.isReady) {
                await this.backupSessionData();
            }
        }, 600000); // 10 minutes
    }

    async loadContacts() {
        try {
            if (!this.isReady) return;

            const contacts = await this.client.getContacts();
            
            for (const contact of contacts) {
                const contactData = {
                    contact_id: contact.id._serialized,
                    phone_number: contact.number,
                    display_name: contact.name || contact.pushname,
                    is_group: contact.isGroup,
                    is_business: contact.isBusiness,
                    contact_data: {
                        pushname: contact.pushname,
                        shortName: contact.shortName,
                        profilePicUrl: contact.profilePicUrl
                    }
                };

                await this.supabase
                    .from('whatsapp_contacts')
                    .upsert(contactData, { 
                        onConflict: 'contact_id',
                        returning: 'minimal'
                    });
            }

            console.log(`Loaded ${contacts.length} contacts`);

        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    async processAutoReply(message) {
        try {
            console.log('🔄 Starting processAutoReply for message:', message.body);
            
            // Check if auto-reply is enabled
            const { data: settings } = await this.supabase
                .from('whatsapp_settings')
                .select('setting_value')
                .eq('setting_key', 'auto_reply_enabled')
                .single();

            if (!settings || settings.setting_value !== true) {
                console.log('🚫 Auto-reply disabled, skipping...');
                return;
            }

            // ENHANCED ANTI-LOOP PROTECTION FOR AUTO-REPLY
            
            // Don't reply to group messages or own messages
            if (message.from.includes('@g.us') || message.fromMe) {
                console.log('🚫 Skipping group message or own message in auto-reply');
                return;
            }

            // Additional check for message ID in auto-reply
            const messageId = message.id._serialized;
            if (this.processedMessages.has(messageId + '_auto_reply')) {
                console.log(`🚫 Auto-reply already processed for message: ${messageId}`);
                return;
            }

            // Mark this message as processed for auto-reply
            this.processedMessages.add(messageId + '_auto_reply');

            console.log(`Processing auto-reply for message from ${message.from}: "${message.body}"`);

            // Extract phone number from WhatsApp ID
            const phoneNumber = message.from.replace('@c.us', '');
            
            // Check if member is verified
            const verifiedMember = await this.checkMemberVerification(phoneNumber);
            
            const messageBody = message.body.toLowerCase().trim();
            let replyMessage = '';

            if (!verifiedMember) {
                // Handle unverified users
                replyMessage = await this.handleUnverifiedUser(messageBody, phoneNumber);
            } else {
                // Handle verified members
                replyMessage = await this.handleVerifiedMember(messageBody, verifiedMember);
            }

            if (replyMessage) {
                console.log(`Sending auto-reply to ${message.from}: "${replyMessage.substring(0, 100)}..."`);
                
                // Send auto-reply with a small delay
                setTimeout(async () => {
                    try {
                        await this.sendMessage(message.from, replyMessage);
                        console.log(`Auto-reply sent successfully to ${message.from}`);
                    } catch (error) {
                        console.error('Error sending auto-reply:', error);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Error in processAutoReply:', error);
        }
    }

    async checkMemberVerification(phoneNumber) {
        try {
            // Clean phone number format (remove country code if present)
            let cleanPhoneNumber = phoneNumber;
            if (phoneNumber.startsWith('62')) {
                cleanPhoneNumber = '0' + phoneNumber.substring(2);
            }

            const { data, error } = await this.supabase
                .from('whatsapp_verifications')
                .select(`
                    *,
                    member:members(*)
                `)
                .eq('phone_number', cleanPhoneNumber)
                .eq('is_verified', true)
                .single();

            if (error) {
                console.log(`No verified member found for ${phoneNumber} (cleaned: ${cleanPhoneNumber})`);
                return null;
            }

            console.log(`Verified member found: ${data.member?.nama_lengkap}`);
            return data;
        } catch (error) {
            console.error('Error checking member verification:', error);
            return null;
        }
    }

    async handleUnverifiedUser(messageBody, phoneNumber) {
        // Check if user is trying to verify
        if (messageBody.includes('verify') || messageBody.includes('verifikasi')) {
            return `🔐 *Verifikasi Anggota SIDARSIH CIMAHI*

Untuk menggunakan layanan bot ini, silakan lakukan verifikasi dengan mengirimkan:

📝 Format: VERIFY [Nama Lengkap] [Nomor Anggota]
📝 Contoh: VERIFY John Doe 12345

Atau hubungi admin untuk bantuan verifikasi:
📞 Admin: 0812-3456-7890

Setelah terverifikasi, Anda dapat mengakses semua fitur bot.`;
        }

        // Default message for unverified users
        return `👋 Selamat datang di SIDARSIH CIMAHI!

🔐 Nomor WhatsApp Anda belum terverifikasi sebagai anggota.

Untuk menggunakan layanan bot:
• Ketik *VERIFY* untuk panduan verifikasi
• Atau hubungi admin: 0812-3456-7890

Setelah verifikasi, Anda dapat mengakses:
💰 Cek saldo simpanan
🏦 Info pinjaman
📊 Riwayat transaksi
📞 Layanan anggota lainnya`;
    }

    async handleVerifiedMember(messageBody, verifiedMember) {
        const member = verifiedMember.member;
        
        // Menu commands
        if (messageBody.includes('menu') || messageBody.includes('help') || messageBody.includes('bantuan')) {
            return `🏦 *Menu SIDARSIH CIMAHI*

Selamat datang, ${member.nama_lengkap}! 👋
ID Anggota: ${member.id_anggota}

Pilih layanan:
1️⃣ *SALDO* - Cek saldo simpanan
2️⃣ *PINJAMAN* - Info pinjaman aktif
3️⃣ *RIWAYAT* - Riwayat transaksi
4️⃣ *SIMPAN* - Info simpanan
5️⃣ *KONTAK* - Hubungi admin

Ketik nomor atau kata kunci untuk mengakses layanan.`;
        }

        // Saldo command
        if (messageBody.includes('saldo') || messageBody === '1') {
            return await this.getMemberBalance(member);
        }

        // Pinjaman command
        if (messageBody.includes('pinjaman') || messageBody === '2') {
            return await this.getMemberLoans(member);
        }

        // Riwayat command
        if (messageBody.includes('riwayat') || messageBody === '3') {
            return await this.getMemberHistory(member);
        }

        // Simpanan command
        if (messageBody.includes('simpan') || messageBody === '4') {
            return await this.getMemberSavings(member);
        }

        // Kontak command
        if (messageBody.includes('kontak') || messageBody === '5') {
            return `📞 *Kontak SIDARSIH CIMAHI*

🏢 Kantor Pusat:
📍 Jl. Raya Cimahi No. 123
📞 (022) 6652345
📧 info@kp2acimahi.com

👨‍💼 Admin WhatsApp:
📱 0812-3456-7890

🕒 Jam Operasional:
Senin - Jumat: 08:00 - 17:00
Sabtu: 08:00 - 12:00

Kami siap melayani Anda! 🙏`;
        }

        // Default response for verified members
        return `Halo ${member.nama_lengkap}! 👋

Terima kasih telah menghubungi SIDARSIH CIMAHI.

Ketik *MENU* untuk melihat layanan yang tersedia, atau langsung ketik:
• *SALDO* untuk cek saldo
• *PINJAMAN* untuk info pinjaman
• *RIWAYAT* untuk riwayat transaksi

Ada yang bisa kami bantu? 😊`;
    }

    async getMemberBalance(member) {
        try {
            // Get member savings
            const { data: savings, error: savingsError } = await this.supabase
                .from('savings')
                .select('*')
                .eq('member_id', member.id);

            if (savingsError) throw savingsError;

            let totalSavings = 0;
            let savingsDetail = '';

            if (savings && savings.length > 0) {
                savings.forEach(saving => {
                    totalSavings += saving.amount || 0;
                    savingsDetail += `💰 ${saving.type || 'Simpanan'}: Rp ${(saving.amount || 0).toLocaleString('id-ID')}\n`;
                });
            }

            return `💰 *Informasi Saldo Simpanan*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

${savingsDetail || '💰 Belum ada data simpanan'}

📊 *Total Simpanan: Rp ${totalSavings.toLocaleString('id-ID')}*

_Data per ${new Date().toLocaleDateString('id-ID')}_

Untuk informasi lebih detail, hubungi admin.`;

        } catch (error) {
            console.error('Error getting member balance:', error);
            return `❌ Maaf, terjadi kesalahan saat mengambil data saldo.

Silakan coba lagi atau hubungi admin untuk bantuan.`;
        }
    }

    async getMemberLoans(member) {
        try {
            // Get member loans
            const { data: loans, error: loansError } = await this.supabase
                .from('loans')
                .select('*')
                .eq('member_id', member.id)
                .eq('status', 'active');

            if (loansError) throw loansError;

            if (!loans || loans.length === 0) {
                return `🏦 *Informasi Pinjaman*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

✅ Tidak ada pinjaman aktif saat ini.

Untuk pengajuan pinjaman baru:
📞 Hubungi admin: 0812-3456-7890
🏢 Kunjungi kantor SIDARSIH CIMAHI`;
            }

            let loansDetail = '';
            let totalLoan = 0;

            loans.forEach(loan => {
                totalLoan += loan.remaining_amount || loan.amount || 0;
                loansDetail += `🏦 Pinjaman ${loan.loan_type || 'Reguler'}
💵 Jumlah: Rp ${(loan.amount || 0).toLocaleString('id-ID')}
💰 Sisa: Rp ${(loan.remaining_amount || 0).toLocaleString('id-ID')}
📅 Jatuh Tempo: ${loan.due_date ? new Date(loan.due_date).toLocaleDateString('id-ID') : 'Belum ditentukan'}

`;
            });

            return `🏦 *Informasi Pinjaman*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

${loansDetail}📊 *Total Sisa Pinjaman: Rp ${totalLoan.toLocaleString('id-ID')}*

_Data per ${new Date().toLocaleDateString('id-ID')}_

Untuk pembayaran atau info detail, hubungi admin.`;

        } catch (error) {
            console.error('Error getting member loans:', error);
            return `❌ Maaf, terjadi kesalahan saat mengambil data pinjaman.

Silakan coba lagi atau hubungi admin untuk bantuan.`;
        }
    }

    async getMemberHistory(member) {
        try {
            // Get recent transactions
            const { data: transactions, error: transError } = await this.supabase
                .from('financial_reports')
                .select('*')
                .eq('member_id', member.id)
                .order('transaction_date', { ascending: false })
                .limit(5);

            if (transError) throw transError;

            if (!transactions || transactions.length === 0) {
                return `📊 *Riwayat Transaksi*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

📝 Belum ada riwayat transaksi.

Untuk informasi lebih lanjut, hubungi admin.`;
            }

            let historyDetail = '';
            transactions.forEach(trans => {
                const date = new Date(trans.transaction_date).toLocaleDateString('id-ID');
                const amount = (trans.amount || 0).toLocaleString('id-ID');
                historyDetail += `📅 ${date}
💰 ${trans.transaction_type || 'Transaksi'}: Rp ${amount}
📝 ${trans.description || 'Tidak ada keterangan'}

`;
            });

            return `📊 *Riwayat Transaksi (5 Terakhir)*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

${historyDetail}Untuk riwayat lengkap, hubungi admin atau kunjungi kantor.`;

        } catch (error) {
            console.error('Error getting member history:', error);
            return `❌ Maaf, terjadi kesalahan saat mengambil riwayat transaksi.

Silakan coba lagi atau hubungi admin untuk bantuan.`;
        }
    }

    async getMemberSavings(member) {
        try {
            // Get detailed savings information
            const { data: savings, error: savingsError } = await this.supabase
                .from('savings')
                .select('*')
                .eq('member_id', member.id)
                .order('created_at', { ascending: false });

            if (savingsError) throw savingsError;

            if (!savings || savings.length === 0) {
                return `💰 *Informasi Simpanan*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

📝 Belum ada data simpanan.

Untuk memulai simpanan:
📞 Hubungi admin: 0812-3456-7890
🏢 Kunjungi kantor SIDARSIH CIMAHI`;
            }

            let savingsDetail = '';
            let totalSavings = 0;

            // Group savings by type
            const savingsByType = {};
            savings.forEach(saving => {
                const type = saving.type || 'Simpanan Umum';
                if (!savingsByType[type]) {
                    savingsByType[type] = 0;
                }
                savingsByType[type] += saving.amount || 0;
                totalSavings += saving.amount || 0;
            });

            Object.keys(savingsByType).forEach(type => {
                savingsDetail += `💰 ${type}: Rp ${savingsByType[type].toLocaleString('id-ID')}\n`;
            });

            return `💰 *Informasi Simpanan Detail*

👤 ${member.nama_lengkap}
🆔 ID Anggota: ${member.id_anggota}

${savingsDetail}
📊 *Total Simpanan: Rp ${totalSavings.toLocaleString('id-ID')}*

_Data per ${new Date().toLocaleDateString('id-ID')}_

Untuk setoran atau penarikan, hubungi admin.`;

        } catch (error) {
            console.error('Error getting member savings:', error);
            return `❌ Maaf, terjadi kesalahan saat mengambil data simpanan.

Silakan coba lagi atau hubungi admin untuk bantuan.`;
        }
    }

    // Get current QR code
    getQRCode() {
        return this.currentQRCode;
    }

    // Check if browser libraries are available
    isBrowserAvailable() {
        try {
            const { execSync } = require('child_process');
            const os = require('os');
            
            // Check for required libraries on Linux
            if (os.platform() === 'linux') {
                try {
                    // Check for multiple critical libraries
                    const requiredLibs = [
                        'libatk-1.0.so.0',
                        'libgtk-3.so.0',
                        'libx11.so.6',
                        'libnss3.so'
                    ];
                    
                    for (const lib of requiredLibs) {
                        try {
                            execSync(`ldconfig -p | grep ${lib}`, { stdio: 'ignore' });
                        } catch (libError) {
                            console.log(`⚠️ Missing required library: ${lib}`);
                            return false;
                        }
                    }
                    
                    // Also check if Chrome/Chromium is available
                    try {
                        execSync('which google-chrome || which chromium-browser || which chromium', { stdio: 'ignore' });
                        console.log('✅ Browser libraries and Chrome/Chromium found');
                        return true;
                    } catch (chromeError) {
                        console.log('⚠️ Chrome/Chromium not found');
                        return false;
                    }
                    
                } catch (error) {
                    console.log('⚠️ Error checking browser libraries:', error.message);
                    return false;
                }
            }
            
            // For other platforms, assume browser is available
            return true;
        } catch (error) {
            console.log('⚠️ Error checking browser availability:', error.message);
            return false;
        }
    }

    async _activateDemoMode() {
        try {
            console.log('🎭 Activating demo mode...');
            
            // Stop all reconnection attempts
            this.isReconnecting = false;
            this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further attempts
            this.isInitializing = false; // Reset initialization flag
            
            // Stop health monitoring to prevent further crashes
            this.stopHealthMonitoring();
            
            // Set demo mode flags first
            this.isDemoMode = true;
            
            // Emit demo mode status immediately
            this.io.emit('whatsapp:status_change', {
                status: 'demo_mode',
                isConnected: false,
                message: 'Running in demo mode - browser not available',
                timestamp: new Date().toISOString()
            });
            
            // Generate demo QR code immediately
            await this._generateDemoQRCode();
            
            console.log('✅ Demo mode activated successfully');
            
        } catch (error) {
            console.error('❌ Error activating demo mode:', error);
            
            // Fallback: emit basic demo QR if generation fails
            this.io.emit('whatsapp:qr', {
                qr: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMDAwIj5EZW1vIE1vZGU8L3RleHQ+PC9zdmc+',
                sessionId: this.currentSessionId,
                isDemo: true,
                message: 'Demo QR Code - Browser libraries not available'
            });
        }
    }

    // Generate demo QR code for testing purposes
    async _generateDemoQRCode() {
        try {
            console.log('🎭 Generating demo QR code...');
            
            // Generate a demo QR code with sample WhatsApp connection data
            const demoData = `2@${Math.random().toString(36).substring(2, 15)},${Math.random().toString(36).substring(2, 15)},${Date.now()}`;
            const qrCodeDataURL = await qrcode.toDataURL(demoData, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            this.currentQRCode = qrCodeDataURL;
            
            // Emit QR code to frontend
            this.io.emit('whatsapp:qr', {
                qr: qrCodeDataURL,
                sessionId: this.currentSessionId,
                isDemo: true,
                message: 'Demo QR Code - Browser libraries not available'
            });

            console.log('✅ Demo QR code generated and emitted');
            
            // Simulate connection after 10 seconds for demo purposes
            setTimeout(() => {
                console.log('🎭 Simulating demo connection...');
                this.isReady = true;
                this.phoneNumber = '+62812345678 (Demo)';
                
                this.io.emit('whatsapp:ready', {
                    sessionId: this.currentSessionId,
                    phoneNumber: this.phoneNumber,
                    isDemo: true,
                    message: 'Demo mode - WhatsApp simulation ready'
                });
                
                this.io.emit('whatsapp:status', {
                    connected: true,
                    phoneNumber: this.phoneNumber,
                    sessionId: this.currentSessionId,
                    isDemo: true,
                    lastSeen: new Date().toISOString()
                });
            }, 10000);
            
        } catch (error) {
            console.error('❌ Error generating demo QR code:', error);
            throw error;
        }
    }
}

module.exports = WhatsAppClientService;