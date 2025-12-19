const MemberValidationService = require('./MemberValidationService');

/**
 * Message Handler Service
 * Processes incoming WhatsApp messages, validates members, and routes to appropriate handlers
 * Following patterns from the original Google Sheets bot implementation
 */
class MessageHandlerService {
    constructor(supabaseClient, commandRouter, analyticsLogger) {
        this.supabase = supabaseClient;
        this.memberValidator = new MemberValidationService(supabaseClient);
        this.commandRouter = commandRouter;
        this.analyticsLogger = analyticsLogger;
        
        // Business hours configuration - UPDATED FOR 24/7 OPERATION
        this.businessHours = {
            start: 0, // 24/7 operation - start at midnight
            end: 24,  // 24/7 operation - end at midnight next day
            timezone: 'Asia/Jakarta',
            enabled: false // Disable business hours restriction for 24/7 operation
        };

        // Anti-loop protection for MessageHandler
        this.processedMessages = new Set();
        this.isProcessingMessage = false;
        this.lastResponseTime = 0;
        this.RATE_LIMIT_DELAY = 2000; // 2 seconds between responses
        
        // Clean processed messages every 5 minutes
        setInterval(() => {
            this.processedMessages.clear();
            console.log('🧹 MessageHandler: Cleared processed messages cache');
        }, 300000);
        
        console.log('✅ MessageHandlerService initialized with anti-loop protection');
    }

    /**
     * Main message processing function
     * @param {Object} message - WhatsApp message object (Baileys format)
     * @param {Object} whatsappClient - WhatsApp client instance for sending replies
     */
    async processMessage(message, whatsappClient) {
        const messageId = message.key.id;
        const messageText = this.extractMessageText(message);
        
        try {
            console.log(`🔄 MessageHandler: Processing message ${messageId}`);
            console.log(`📝 Message text: "${messageText}"`);
            
            // ENHANCED ANTI-LOOP PROTECTION
            
            // 1. Check if message was already processed
            if (this.processedMessages.has(messageId)) {
                console.log(`🚫 MessageHandler: Message already processed: ${messageId}`);
                return;
            }

            // 2. Check if another message is being processed
            if (this.isProcessingMessage) {
                console.log('🚫 MessageHandler: Another message is being processed, skipping');
                return;
            }

            // 3. Rate limiting check - reduced to 500ms for better responsiveness
            const now = Date.now();
            if (now - this.lastResponseTime < 500) {
                console.log(`🚫 MessageHandler: Rate limit active (${500}ms delay)`);
                return;
            }

            // 4. Skip processing for certain message types
            if (this.shouldSkipMessage(message)) {
                console.log('🚫 MessageHandler: Message should be skipped');
                return;
            }

            // Mark as processing and add to processed set
            this.isProcessingMessage = true;
            this.processedMessages.add(messageId);

            // Extract phone number from message
            const phoneNumber = this.extractPhoneNumber(message);
            if (!phoneNumber) {
                console.log('🚫 MessageHandler: Could not extract phone number from message');
                return;
            }

            console.log(`✅ MessageHandler: Processing message from ${phoneNumber}: "${messageText}"`);

            // Validate member
            console.log('🔍 Validating member...');
            const memberValidation = await this.memberValidator.validateMemberByPhone(phoneNumber);
            console.log(`👤 Member validation result:`, {
                isValid: memberValidation.isValid,
                memberName: memberValidation.isValid ? memberValidation.member.name : 'N/A'
            });
            
            if (memberValidation.isValid) {
                // Member found - process command
                console.log(`✅ Processing command for registered member: ${memberValidation.member.name}`);
                await this.handleMemberMessage(message, memberValidation.member, whatsappClient);
            } else {
                // Member not found - send registration prompt
                console.log(`❌ Member not found, sending registration prompt`);
                await this.handleNonMemberMessage(message, phoneNumber, whatsappClient);
            }

            // Update last response time
            this.lastResponseTime = Date.now();

            // Log analytics
            if (this.analyticsLogger) {
                console.log('📊 Logging analytics...');
                await this.analyticsLogger.logMessageReceived(
                    phoneNumber,
                    messageText,
                    memberValidation.isValid ? memberValidation.member.id : null
                );
            }

            console.log(`✅ MessageHandler: Message processed successfully: ${messageId}`);

        } catch (error) {
            console.error('❌ MessageHandler: Error processing message:', error);
            
            // Send error message to user
            try {
                const chatId = message.key.remoteJid;
                await whatsappClient.sendMessage(chatId, { 
                    text: '❌ Maaf, terjadi kesalahan sistem. Silakan coba lagi nanti atau hubungi admin.' 
                });
                console.log('✅ Error message sent to user');
            } catch (sendError) {
                console.error('❌ MessageHandler: Error sending error message:', sendError);
            }
        } finally {
            // Always release processing lock
            this.isProcessingMessage = false;
            console.log('🔓 MessageHandler: Processing lock released');
        }
    }

    /**
     * Extract message text from Baileys message object
     * @param {Object} message - Baileys message object
     * @returns {string} - Extracted message text
     */
    extractMessageText(message) {
        try {
            if (!message || !message.message) {
                console.log('⚠️ No message object or message.message found');
                return '';
            }
            
            console.log('🔍 Extracting text from message types:', Object.keys(message.message));
            
            // Handle different message types in Baileys
            if (message.message.conversation) {
                console.log('✅ Found conversation text:', message.message.conversation);
                return message.message.conversation;
            }
            
            if (message.message.extendedTextMessage?.text) {
                console.log('✅ Found extended text:', message.message.extendedTextMessage.text);
                return message.message.extendedTextMessage.text;
            }
            
            if (message.message.imageMessage?.caption) {
                console.log('✅ Found image caption:', message.message.imageMessage.caption);
                return message.message.imageMessage.caption;
            }
            
            if (message.message.videoMessage?.caption) {
                console.log('✅ Found video caption:', message.message.videoMessage.caption);
                return message.message.videoMessage.caption;
            }
            
            // Handle document messages with caption
            if (message.message.documentMessage?.caption) {
                console.log('✅ Found document caption:', message.message.documentMessage.caption);
                return message.message.documentMessage.caption;
            }
            
            // Handle audio messages (voice notes) - no text content
            if (message.message.audioMessage) {
                console.log('🎵 Audio message detected - no text content');
                return '';
            }
            
            // Handle sticker messages - no text content
            if (message.message.stickerMessage) {
                console.log('😀 Sticker message detected - no text content');
                return '';
            }
            
            // Handle location messages
            if (message.message.locationMessage) {
                console.log('📍 Location message detected - no text content');
                return '';
            }
            
            // Handle contact messages
            if (message.message.contactMessage) {
                console.log('👤 Contact message detected - no text content');
                return '';
            }
            
            // Handle list response messages
            if (message.message.listResponseMessage) {
                const title = message.message.listResponseMessage.title;
                console.log('📋 List response message:', title);
                return title || '';
            }
            
            // Handle button response messages
            if (message.message.buttonsResponseMessage) {
                const selectedButtonId = message.message.buttonsResponseMessage.selectedButtonId;
                console.log('🔘 Button response message:', selectedButtonId);
                return selectedButtonId || '';
            }
            
            // Handle template button reply messages
            if (message.message.templateButtonReplyMessage) {
                const selectedId = message.message.templateButtonReplyMessage.selectedId;
                console.log('🔘 Template button reply:', selectedId);
                return selectedId || '';
            }
            
            console.log('⚠️ No extractable text found in message types:', Object.keys(message.message));
            return '';
        } catch (error) {
            console.error('❌ Error extracting message text:', error);
            return '';
        }
    }

    /**
     * Check if message should be skipped (updated for Baileys format)
     * @param {Object} message - Baileys message object
     * @returns {boolean} - True if message should be skipped
     */
    shouldSkipMessage(message) {
        console.log('🔍 Checking if message should be skipped...');
        
        // Skip if message is from status broadcast
        if (message.key.remoteJid === 'status@broadcast') {
            console.log('🚫 Skipping status broadcast message');
            return true;
        }

        // Skip if message is from group (only handle individual messages)
        if (message.key.remoteJid && message.key.remoteJid.includes('@g.us')) {
            console.log('🚫 Skipping group message');
            return true;
        }

        // Skip if message is from self (bot's own messages)
        if (message.key.fromMe) {
            console.log('🚫 Skipping message from self');
            return true;
        }

        // Extract message text to check if it's empty
        const messageText = this.extractMessageText(message);
        
        // Only skip if there's absolutely no text content
        if (!messageText || messageText.trim() === '') {
            console.log('🚫 Skipping message with no text content');
            return true;
        }

        console.log('✅ Message should be processed');
        return false;
    }

    /**
     * Extract phone number from Baileys message object
     * @param {Object} message - Baileys message object
     * @returns {string|null} - Extracted phone number or null
     */
    extractPhoneNumber(message) {
        try {
            // Baileys message.key.remoteJid format: "6281234567890@s.whatsapp.net"
            const phoneWithSuffix = message.key.remoteJid;
            
            if (!phoneWithSuffix || !phoneWithSuffix.includes('@')) {
                return null;
            }

            // Extract phone number (remove @s.whatsapp.net suffix)
            const phoneNumber = phoneWithSuffix.split('@')[0];
            
            // Validate that it's a valid phone number
            if (!/^\d+$/.test(phoneNumber)) {
                return null;
            }

            return phoneNumber;
        } catch (error) {
            console.error('Error extracting phone number:', error);
            return null;
        }
    }

    /**
     * Handle message from registered member (updated for Baileys format)
     * @param {Object} message - Baileys message object
     * @param {Object} member - Member data
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async handleMemberMessage(message, member, whatsappClient) {
        try {
            const messageText = this.extractMessageText(message).trim().toLowerCase();
            const chatId = message.key.remoteJid;
            
            // REMOVED BUSINESS HOURS CHECK FOR 24/7 OPERATION
            // Bot now operates 24/7 without time restrictions
            console.log(`✅ MessageHandler: Processing member message 24/7 from ${member.name}: ${messageText}`);

            // Route to command handler
            if (this.commandRouter) {
                await this.commandRouter.handleCommand(messageText, member, chatId, whatsappClient);
            } else {
                // Fallback if command router is not available
                await this.sendWelcomeMessage(chatId, member, whatsappClient);
            }

        } catch (error) {
            console.error('Error handling member message:', error);
            await whatsappClient.sendMessage(
                message.key.remoteJid,
                { text: '❌ Maaf, terjadi kesalahan. Silakan coba lagi atau ketik *menu* untuk melihat daftar perintah.' }
            );
        }
    }

    /**
     * Handle message from non-registered member (updated for Baileys format)
     * @param {Object} message - Baileys message object
     * @param {string} phoneNumber - Phone number
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async handleNonMemberMessage(message, phoneNumber, whatsappClient) {
        try {
            const registrationMessage = `
🔒 *AKSES TERBATAS*

Maaf, nomor Anda belum terdaftar sebagai anggota SIDARSIH CIMAHI.

📝 *Untuk mendaftar sebagai anggota:*
• Kunjungi kantor SIDARSIH CIMAHI
• Bawa persyaratan lengkap
• Atau hubungi admin di nomor: 0831-4057-3853

📍 *Alamat Kantor:*
Jl. Baros - Cimahi
Buka: Senin-Jumat, 08:00-17:00

Terima kasih! 🙏
            `.trim();

            await whatsappClient.sendMessage(message.key.remoteJid, { text: registrationMessage });

            // Log non-member attempt
            if (this.analyticsLogger) {
                const messageText = this.extractMessageText(message);
                await this.analyticsLogger.logNonMemberAccess(phoneNumber, messageText);
            }

        } catch (error) {
            console.error('Error handling non-member message:', error);
        }
    }

    /**
     * Send welcome message to member
     * @param {string} chatId - WhatsApp chat ID
     * @param {Object} member - Member data
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async sendWelcomeMessage(chatId, member, whatsappClient) {
        try {
            const welcomeMessage = `
👋 *Selamat datang, ${member.name}!*
🏦 *SIDARSIH CIMAHI - Bot Layanan*

📋 *Menu:*
• *simpanan* - Cek saldo
• *pinjaman* - Info pinjaman
• *profil* - Data anggota
• *info* - Tentang SIDARSIH
• *kontak* - Kontak kantor
• *menu* - Tampilkan menu

💡 Ketik kata kunci untuk akses layanan
Selamat menggunakan! 🚀
            `.trim();

            await whatsappClient.sendMessage(chatId, { text: welcomeMessage });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }

    /**
     * Send 24/7 service information message
     * UPDATED FOR 24/7 OPERATION - This function is now for informational purposes only
     * @param {string} chatId - WhatsApp chat ID
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async sendBusinessHoursMessage(chatId, whatsappClient) {
        try {
            const currentTime = new Date().toLocaleString('id-ID', {
                timeZone: this.businessHours.timezone,
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const serviceInfoMessage = `
🤖 *LAYANAN BOT 24/7*

✅ Bot SIDARSIH CIMAHI siap melayani Anda!

⏰ *Jam Layanan Bot:*
🕐 24 Jam Sehari, 7 Hari Seminggu

🕐 *Waktu sekarang:* ${currentTime}

📋 *Layanan yang tersedia:*
• Cek saldo simpanan
• Info pinjaman aktif
• Data profil anggota
• Informasi umum SIDARSIH CIMAHI
• Dan layanan lainnya

💡 *Ketik 'menu' untuk melihat semua layanan*

Selamat menggunakan layanan digital SIDARSIH CIMAHI! 🚀
            `.trim();

            await whatsappClient.sendMessage(chatId, { text: serviceInfoMessage });
        } catch (error) {
            console.error('Error sending service info message:', error);
        }
    }

    /**
     * Check if current time is within business hours
     * UPDATED FOR 24/7 OPERATION - Always returns true
     * @returns {boolean} - Always true for 24/7 operation
     */
    isBusinessHours() {
        try {
            // Check if business hours restriction is enabled
            if (!this.businessHours.enabled) {
                console.log('✅ MessageHandler: 24/7 operation mode - business hours check disabled');
                return true; // Always allow access for 24/7 operation
            }

            // Legacy business hours check (kept for compatibility)
            const now = new Date();
            const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: this.businessHours.timezone}));
            const currentHour = jakartaTime.getHours();
            const currentDay = jakartaTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            // Check if it's a weekday (Monday to Friday)
            const isWeekday = currentDay >= 1 && currentDay <= 5;

            // Check if it's within business hours
            const isWithinHours = currentHour >= this.businessHours.start && currentHour < this.businessHours.end;

            return isWeekday && isWithinHours;
        } catch (error) {
            console.error('Error checking business hours:', error);
            return true; // Default to allowing access if there's an error
        }
    }

    /**
     * Check if command is urgent (allowed outside business hours)
     * @param {string} command - Command text
     * @returns {boolean} - True if command is urgent
     */
    isUrgentCommand(command) {
        const urgentCommands = ['darurat', 'emergency', 'help', 'bantuan'];
        return urgentCommands.some(urgent => command.includes(urgent));
    }

    /**
     * Update business hours configuration
     * @param {Object} newHours - New business hours configuration
     */
    updateBusinessHours(newHours) {
        this.businessHours = { ...this.businessHours, ...newHours };
    }

    /**
     * Get current business hours configuration
     * @returns {Object} - Current business hours configuration
     */
    getBusinessHours() {
        return { ...this.businessHours };
    }

    /**
     * Process bulk messages (for future enhancement)
     * @param {Array} messages - Array of messages to process
     * @param {Object} whatsappClient - WhatsApp client instance
     */
    async processBulkMessages(messages, whatsappClient) {
        const results = [];
        
        for (const message of messages) {
            try {
                await this.processMessage(message, whatsappClient);
                results.push({ success: true, messageId: message.id });
            } catch (error) {
                console.error(`Error processing message ${message.id}:`, error);
                results.push({ success: false, messageId: message.id, error: error.message });
            }
        }
        
        return results;
    }
}

module.exports = MessageHandlerService;