const BroadcastService = require('./BroadcastService');

class WhatsAppBroadcastSender {
  constructor(baileysService, supabaseClient) {
    this.baileysService = baileysService;
    this.supabase = supabaseClient;
    this.broadcastService = new BroadcastService();
    this.isProcessing = false;
    this.currentBroadcast = null;
    this.processingQueue = [];
    
    // Rate limiting configuration
    this.messageDelay = 2000; // 2 seconds between messages
    this.batchSize = 10; // Process 10 messages at a time
    this.maxRetries = 3;
    
    console.log('✅ WhatsApp Broadcast Sender initialized');
  }

  /**
   * Start processing broadcast queue
   */
  async startBroadcastProcessor() {
    if (this.isProcessing) {
      console.log('📤 Broadcast processor already running');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting broadcast processor...');

    while (this.isProcessing) {
      try {
        // Get pending broadcasts
        const pendingBroadcasts = await this.broadcastService.getPendingBroadcasts({
          page: 1,
          limit: 5
        });

        if (pendingBroadcasts.broadcasts.length > 0) {
          for (const broadcast of pendingBroadcasts.broadcasts) {
            if (!this.isProcessing) break;
            
            await this.processBroadcast(broadcast);
          }
        }

        // Wait before checking for more broadcasts
        await this.sleep(5000); // Check every 5 seconds
        
      } catch (error) {
        console.error('❌ Error in broadcast processor:', error);
        await this.sleep(10000); // Wait longer on error
      }
    }

    console.log('⏹️ Broadcast processor stopped');
  }

  /**
   * Stop the broadcast processor
   */
  stopBroadcastProcessor() {
    console.log('🛑 Stopping broadcast processor...');
    this.isProcessing = false;
  }

  /**
   * Process a single broadcast
   * @param {Object} broadcast - Broadcast data
   */
  async processBroadcast(broadcast) {
    try {
      console.log(`📤 Processing broadcast ${broadcast.id}: "${broadcast.message.substring(0, 50)}..."`);
      
      this.currentBroadcast = broadcast;
      
      // Update broadcast status to sending
      await this.broadcastService.updateBroadcastStatus(broadcast.id, 'sending');

      // Get pending recipients for this broadcast
      const recipients = await this.broadcastService.getPendingRecipients(broadcast.id);
      
      if (recipients.length === 0) {
        console.log(`⚠️ No pending recipients for broadcast ${broadcast.id}`);
        await this.broadcastService.updateBroadcastStatus(broadcast.id, 'completed');
        return;
      }

      console.log(`📋 Found ${recipients.length} recipients for broadcast ${broadcast.id}`);

      // Process recipients in batches
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < recipients.length; i += this.batchSize) {
        if (!this.isProcessing) break;

        const batch = recipients.slice(i, i + this.batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(recipients.length / this.batchSize)}`);

        for (const recipient of batch) {
          if (!this.isProcessing) break;

          try {
            await this.sendMessageToRecipient(broadcast, recipient);
            successCount++;
            
            // Add delay between messages to avoid rate limiting
            if (i + batch.indexOf(recipient) < recipients.length - 1) {
              await this.sleep(this.messageDelay);
            }
            
          } catch (error) {
            console.error(`❌ Failed to send to ${recipient.phone}:`, error.message);
            failedCount++;
            
            // Update recipient status to failed
            await this.broadcastService.updateRecipientStatus(
              recipient.id,
              'failed',
              error.message
            );
          }
        }

        // Small delay between batches
        await this.sleep(1000);
      }

      // Update final broadcast status
      const finalStatus = failedCount === 0 ? 'completed' : 
                         successCount === 0 ? 'failed' : 'completed';
      
      await this.broadcastService.updateBroadcastStatus(broadcast.id, finalStatus);

      console.log(`✅ Broadcast ${broadcast.id} completed: ${successCount} sent, ${failedCount} failed`);
      
    } catch (error) {
      console.error(`❌ Error processing broadcast ${broadcast.id}:`, error);
      
      // Update broadcast status to failed
      await this.broadcastService.updateBroadcastStatus(broadcast.id, 'failed');
    } finally {
      this.currentBroadcast = null;
    }
  }

  /**
   * Send message to a single recipient
   * @param {Object} broadcast - Broadcast data
   * @param {Object} recipient - Recipient data
   */
  async sendMessageToRecipient(broadcast, recipient) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        // Check if WhatsApp client is ready
        if (!this.baileysService.isReady) {
          throw new Error('WhatsApp client not ready');
        }

        // Format phone number for WhatsApp
        const whatsappId = this.formatPhoneForWhatsApp(recipient.phone);
        
        // Prepare message
        const messageData = {
          text: broadcast.message
        };

        // Send message using Baileys service
        const result = await this.baileysService.sendMessage(whatsappId, messageData);
        
        // Update recipient status to sent
        await this.broadcastService.updateRecipientStatus(
          recipient.id,
          'sent',
          null
        );

        console.log(`✅ Message sent to ${recipient.phone} (${recipient.name})`);
        return result;
        
      } catch (error) {
        retries++;
        console.error(`❌ Attempt ${retries}/${this.maxRetries} failed for ${recipient.phone}:`, error.message);
        
        if (retries >= this.maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await this.sleep(2000 * retries);
      }
    }
  }

  /**
   * Format phone number for WhatsApp
   * @param {string} phone - Phone number
   * @returns {string} Formatted WhatsApp ID
   */
  formatPhoneForWhatsApp(phone) {
    // Remove all non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, '');
    
    // Remove + if present
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    
    // Ensure it starts with country code (62 for Indonesia)
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    } else if (!formatted.startsWith('62')) {
      formatted = '62' + formatted;
    }
    
    // Add @s.whatsapp.net suffix
    return formatted + '@s.whatsapp.net';
  }

  /**
   * Send immediate broadcast (for testing or urgent messages)
   * @param {string} broadcastId - Broadcast ID
   */
  async sendImmediateBroadcast(broadcastId) {
    try {
      const broadcast = await this.broadcastService.getBroadcastById(broadcastId);
      
      if (!broadcast) {
        throw new Error('Broadcast not found');
      }

      if (broadcast.status !== 'pending') {
        throw new Error(`Broadcast status is ${broadcast.status}, cannot send`);
      }

      console.log(`🚀 Sending immediate broadcast ${broadcastId}`);
      await this.processBroadcast(broadcast);
      
    } catch (error) {
      console.error('❌ Error sending immediate broadcast:', error);
      throw error;
    }
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentBroadcast: this.currentBroadcast ? {
        id: this.currentBroadcast.id,
        message: this.currentBroadcast.message.substring(0, 100) + '...',
        recipientCount: this.currentBroadcast.recipient_count
      } : null,
      queueLength: this.processingQueue.length,
      whatsappReady: this.baileysService.isReady
    };
  }

  /**
   * Validate phone number for WhatsApp
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  isValidWhatsAppNumber(phone) {
    // Basic validation for Indonesian phone numbers
    const phoneRegex = /^(\+?62|0)8[1-9][0-9]{6,10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Test message sending to a single number
   * @param {string} phone - Phone number
   * @param {string} message - Test message
   */
  async sendTestMessage(phone, message) {
    try {
      console.log(`🧪 Testing message send to ${phone}: "${message.substring(0, 50)}..."`);
      
      // Validate phone number format first
      if (!this.isValidWhatsAppNumber(phone)) {
        throw new Error('Invalid phone number format. Please use Indonesian format (e.g., 08123456789 or +628123456789)');
      }

      // Check if WhatsApp client is ready
      if (!this.baileysService.isReady) {
        console.warn('⚠️ WhatsApp client not ready, using demo mode for test message');
        
        // Demo mode - simulate successful message sending
        const demoResult = {
          success: true,
          mode: 'demo',
          message: 'Test message simulated successfully (WhatsApp client not connected)',
          phone: phone,
          messageId: `demo_${Date.now()}`,
          timestamp: new Date().toISOString(),
          details: {
            reason: 'WhatsApp client not ready',
            suggestion: 'Connect WhatsApp client for real message sending'
          }
        };
        
        console.log(`✅ Demo test message simulated for ${phone}`);
        return demoResult;
      }

      // Real mode - send actual message
      const whatsappId = this.formatPhoneForWhatsApp(phone);
      
      const messageData = {
        text: message
      };

      const result = await this.baileysService.sendMessage(whatsappId, messageData);
      
      console.log(`✅ Real test message sent to ${phone}`);
      return {
        success: true,
        mode: 'real',
        message: 'Test message sent successfully',
        phone: phone,
        messageId: result.key?.id || `real_${Date.now()}`,
        timestamp: new Date().toISOString(),
        result: result
      };
      
    } catch (error) {
      console.error(`❌ Failed to send test message to ${phone}:`, error);
      
      // Provide more detailed error information
      const errorDetails = {
        success: false,
        message: error.message,
        phone: phone,
        timestamp: new Date().toISOString(),
        errorType: this.categorizeError(error),
        suggestions: this.getErrorSuggestions(error)
      };
      
      throw new Error(JSON.stringify(errorDetails));
    }
  }

  /**
   * Categorize error types for better debugging
   * @param {Error} error - The error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not ready')) {
      return 'connection_not_ready';
    } else if (message.includes('invalid phone')) {
      return 'invalid_phone_format';
    } else if (message.includes('timeout')) {
      return 'timeout_error';
    } else if (message.includes('network')) {
      return 'network_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * Get error suggestions based on error type
   * @param {Error} error - The error object
   * @returns {Array} Array of suggestions
   */
  getErrorSuggestions(error) {
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'connection_not_ready':
        return [
          'Initialize WhatsApp client first',
          'Scan QR code to connect WhatsApp',
          'Check WhatsApp connection status'
        ];
      case 'invalid_phone_format':
        return [
          'Use Indonesian phone format (08xxxxxxxxx)',
          'Include country code (+62 or 62)',
          'Remove spaces and special characters'
        ];
      case 'timeout_error':
        return [
          'Check internet connection',
          'Try again in a few moments',
          'Verify WhatsApp server status'
        ];
      case 'network_error':
        return [
          'Check internet connectivity',
          'Verify firewall settings',
          'Try reconnecting WhatsApp client'
        ];
      default:
        return [
          'Check WhatsApp client status',
          'Verify phone number format',
          'Try reconnecting if needed'
        ];
    }
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WhatsAppBroadcastSender;