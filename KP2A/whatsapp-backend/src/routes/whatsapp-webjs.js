const express = require('express');
const router = express.Router();

// WhatsApp Web.js Routes
function createWhatsAppRoutes(whatsappClientService) {
  
  // Get WhatsApp connection status
  router.get('/status', async (req, res) => {
    try {
      const status = await whatsappClientService.getStatus();
      
      res.json({
        success: true,
        data: {
          connected: status.connected,
          phoneNumber: status.phoneNumber,
          sessionId: status.sessionId,
          lastSeen: status.lastSeen,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Initialize WhatsApp connection
  router.post('/initialize', async (req, res) => {
    try {
      await whatsappClientService.initialize();
      
      res.json({
        success: true,
        message: 'WhatsApp initialization started. Please scan QR code.',
        data: {
          status: 'initializing',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get QR Code for WhatsApp authentication
  router.get('/qr', async (req, res) => {
    try {
      const qrCode = whatsappClientService.getQRCode();
      
      if (!qrCode) {
        return res.status(404).json({
          success: false,
          error: 'QR Code not available. Please initialize WhatsApp first.',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        data: {
          qrCode: qrCode,
          message: 'Scan this QR code with your WhatsApp mobile app',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting QR code:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Generate new QR Code with enhanced timeout and validation
  router.post('/generate-qr', async (req, res) => {
    try {
      console.log('🔄 QR Code generation request received');
      
      // Use the enhanced generateQRCodeWithTimeout method
      const result = await whatsappClientService.generateQRCodeWithTimeout();
      
      res.json({
        success: true,
        message: result.message,
        data: {
          qrCode: result.qrCode,
          sessionId: result.sessionId,
          timestamp: result.timestamp,
          expiresIn: result.expiresIn,
          compatibility: whatsappClientService.validateWhatsAppMobileCompatibility(),
          instructions: [
            '1. Buka WhatsApp di ponsel Anda',
            '2. Pilih Menu > Perangkat Tertaut',
            '3. Ketuk "Tautkan Perangkat"',
            '4. Scan QR Code ini dengan kamera ponsel',
            '5. Tunggu hingga koneksi berhasil'
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: 'Failed to generate QR Code. Please try again.',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Pastikan tidak ada session WhatsApp yang aktif',
          'Coba buat session baru terlebih dahulu',
          'Periksa koneksi internet',
          'Restart backend service jika diperlukan'
        ]
      });
    }
  });

  // Clear current session and prepare for new connection
  router.post('/clear-session', async (req, res) => {
    try {
      const result = await whatsappClientService.clearSession();
      
      res.json({
        success: true,
        message: 'Session cleared successfully. You can now link a new WhatsApp number.',
        data: {
          sessionCleared: result,
          newSessionId: whatsappClientService.currentSessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error clearing session:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create new session with enhanced error handling and validation
  router.post('/new-session', async (req, res) => {
    try {
      console.log('🆕 New session request received');
      
      // Use the enhanced createNewSession method
      const result = await whatsappClientService.createNewSession();
      
      res.json({
        success: true,
        message: result.message,
        data: {
          sessionId: result.sessionId,
          timestamp: result.timestamp,
          compatibility: whatsappClientService.validateWhatsAppMobileCompatibility()
        }
      });
    } catch (error) {
      console.error('❌ Error creating new session:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: 'Failed to create new WhatsApp session. Please try again.',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Pastikan backend WhatsApp service berjalan',
          'Periksa koneksi internet',
          'Coba restart backend service jika masalah berlanjut'
        ]
      });
    }
  });

  // Get current session information
  router.get('/session-info', async (req, res) => {
    try {
      const status = await whatsappClientService.getStatus();
      
      res.json({
        success: true,
        data: {
          currentSessionId: whatsappClientService.currentSessionId,
          connected: status.connected,
          phoneNumber: status.phoneNumber,
          isReady: whatsappClientService.isReady,
          isInitializing: whatsappClientService.isInitializing,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting session info:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Send WhatsApp message
  router.post('/send', async (req, res) => {
    try {
      const { to, message, media } = req.body;
      
      // Validate required fields
      if (!to || !message) {
        return res.status(400).json({
          success: false,
          error: 'Phone number (to) and message are required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if WhatsApp is ready
      const status = await whatsappClientService.getStatus();
      if (!status.connected) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp is not connected. Please scan QR code first.',
          timestamp: new Date().toISOString()
        });
      }
      
      // Send message
      const result = await whatsappClientService.sendMessage(to, message, { media });
      
      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          messageId: result.messageId,
          to: to,
          message: message,
          timestamp: result.timestamp,
          sentAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get contacts and groups
  router.get('/contacts', async (req, res) => {
    try {
      // Check if WhatsApp is ready
      const status = await whatsappClientService.getStatus();
      if (!status.connected) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp is not connected',
          timestamp: new Date().toISOString()
        });
      }
      
      const contactsData = await whatsappClientService.getContacts();
      
      res.json({
        success: true,
        data: {
          contacts: contactsData.contacts,
          groups: contactsData.groups,
          totalCount: contactsData.totalCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting contacts:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Logout from WhatsApp
  router.post('/logout', async (req, res) => {
    try {
      const result = await whatsappClientService.logout();
      
      res.json({
        success: true,
        message: 'Successfully logged out from WhatsApp',
        data: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get message history
  router.get('/messages', async (req, res) => {
    try {
      const { limit = 50, offset = 0, from, to } = req.query;
      
      // Build query for Supabase
      let query = whatsappClientService.supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Add filters if provided
      if (from) {
        query = query.eq('from_number', from);
      }
      if (to) {
        query = query.eq('to_number', to);
      }

      const { data: messages, error } = await query;

      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          messages: messages || [],
          count: messages?.length || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get session events/logs
  router.get('/events', async (req, res) => {
    try {
      const { limit = 20, offset = 0, eventType } = req.query;
      
      let query = whatsappClientService.supabase
        .from('whatsapp_session_events')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data: events, error } = await query;

      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          events: events || [],
          count: events?.length || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting session events:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Update WhatsApp settings
  router.post('/settings', async (req, res) => {
    try {
      const { settingKey, settingValue, description } = req.body;
      
      if (!settingKey || settingValue === undefined) {
        return res.status(400).json({
          success: false,
          error: 'settingKey and settingValue are required',
          timestamp: new Date().toISOString()
        });
      }

      const { data, error } = await whatsappClientService.supabase
        .from('whatsapp_settings')
        .upsert({
          setting_key: settingKey,
          setting_value: settingValue,
          description: description || null
        }, {
          onConflict: 'setting_key',
          returning: 'minimal'
        });

      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: {
          settingKey,
          settingValue,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get WhatsApp settings
  router.get('/settings', async (req, res) => {
    try {
      const { settingKey } = req.query;
      
      let query = whatsappClientService.supabase
        .from('whatsapp_settings')
        .select('*');

      if (settingKey) {
        query = query.eq('setting_key', settingKey);
      }

      const { data: settings, error } = await query;

      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: {
          settings: settings || [],
          count: settings?.length || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test message processing endpoint (for testing purposes)
  router.post('/test-message', async (req, res) => {
    try {
      const { from, body, type = 'chat' } = req.body;
      
      if (!from || !body) {
        return res.status(400).json({
          success: false,
          error: 'from and body are required',
          timestamp: new Date().toISOString()
        });
      }

      // Create a mock message object similar to whatsapp-web.js message format
      const mockMessage = {
        id: {
          fromMe: false,
          remote: from,
          id: `test_${Date.now()}`,
          _serialized: `test_${Date.now()}_${from}`
        },
        from: from,
        to: '6281234567890@c.us', // Mock bot number
        body: body,
        type: type,
        timestamp: Math.floor(Date.now() / 1000),
        hasMedia: false,
        isStatus: false,
        isStarred: false,
        isForwarded: false,
        fromMe: false,
        hasQuotedMsg: false,
        deviceType: 'android'
      };

      // Get the message handler from WhatsApp client service
      const messageHandler = whatsappClientService.messageHandler;
      
      if (!messageHandler) {
        return res.status(500).json({
          success: false,
          error: 'Message handler not initialized',
          timestamp: new Date().toISOString()
        });
      }

      // Create a mock WhatsApp client for testing
      const mockWhatsAppClient = {
        sendMessage: async (to, message) => {
          console.log(`[TEST] Would send message to ${to}: ${message}`);
          return {
            messageId: `test_reply_${Date.now()}`,
            timestamp: new Date().toISOString()
          };
        }
      };

      // Process the message
      await messageHandler.processMessage(mockMessage, mockWhatsAppClient);
      
      res.json({
        success: true,
        message: 'Test message processed successfully',
        data: {
          processedMessage: {
            from: mockMessage.from,
            body: mockMessage.body,
            type: mockMessage.type
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error processing test message:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      const status = await whatsappClientService.getStatus();
      
      res.json({
        success: true,
        data: {
          service: 'WhatsApp Web.js',
          status: status.connected ? 'healthy' : 'disconnected',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Testing endpoint to force WhatsApp ready status (for development/testing only)
  router.post('/force-ready', async (req, res) => {
    try {
      const { ready = true, phoneNumber = '6283140573853' } = req.body;
      
      // Force the ready status for testing using the service method
      const result = whatsappClientService.forceReadyStatus(ready, phoneNumber);
      
      res.json({
        success: true,
        message: `WhatsApp ready status forced to: ${ready}`,
        data: {
          ...result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error forcing ready status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

module.exports = createWhatsAppRoutes;