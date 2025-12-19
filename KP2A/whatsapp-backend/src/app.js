const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
// Supabase import removed
// const { createClient } = require('@supabase/supabase-js');

// Import services and routes
const BaileysWhatsAppService = require('./services/BaileysWhatsAppService');
const MemberValidationService = require('./services/MemberValidationService');
const MessageHandlerService = require('./services/MessageHandlerService');
const CommandRouterService = require('./services/CommandRouterService');
const TemplateManagerService = require('./services/TemplateManagerService');
const AnalyticsLoggerService = require('./services/AnalyticsLoggerService');
const WhatsAppBroadcastSender = require('./services/WhatsAppBroadcastSender');

const createWhatsAppRoutes = require('./routes/whatsapp-webjs');
const createMembersRoutes = require('./routes/members');
const createAnalyticsRoutes = require('./routes/analytics');
const createConfigRoutes = require('./routes/config');
const barcodeRoutes = require('./routes/barcode');
const createBroadcastRoutes = require('./routes/broadcast');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS for Socket.IO
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:3000",
  "http://localhost:8082",
  process.env.FRONTEND_URL,
  "http://sidarsih.site",
  "https://sidarsih.site",
  "https://www.sidarsih.site",
  process.env.PRODUCTION_DOMAIN,
  process.env.CORS_ORIGINS?.split(',') || []
].flat().filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const supabase = null; // Supabase removed globally

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Backend (Baileys)',
    version: '2.0.0'
  });
});

// Initialize all services
let whatsappClientService;
let memberValidationService;
let messageHandlerService;
let commandRouterService;
let templateManagerService;
let analyticsLoggerService;
let broadcastSender;

try {
  // Initialize core services without Supabase (Migration to MySQL)
  // const supabase = null; // Removed local declaration
  whatsappClientService = new BaileysWhatsAppService(io, supabase);
  memberValidationService = new MemberValidationService(supabase);
  templateManagerService = new TemplateManagerService(supabase);
  analyticsLoggerService = new AnalyticsLoggerService(supabase);
  commandRouterService = new CommandRouterService(supabase, analyticsLoggerService);
  messageHandlerService = new MessageHandlerService(supabase, commandRouterService, analyticsLoggerService);
  broadcastSender = new WhatsAppBroadcastSender(whatsappClientService, supabase);

  console.log('✅ All services initialized successfully');

  // Integrate message handler with WhatsApp client
  whatsappClientService.setMessageHandler(messageHandlerService);

  // Start broadcast processor
  broadcastSender.startBroadcastProcessor();

} catch (error) {
  console.error('❌ Failed to initialize services:', error);
  process.exit(1);
}

// Routes
app.use('/api/whatsapp', createWhatsAppRoutes(whatsappClientService));
app.use('/api/members', createMembersRoutes(memberValidationService));
app.use('/api/analytics', createAnalyticsRoutes(analyticsLoggerService));
app.use('/api/config', createConfigRoutes(templateManagerService, supabase));
app.use('/api/barcode', barcodeRoutes);
app.use('/api/broadcast', createBroadcastRoutes(broadcastSender));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Send current WhatsApp status to newly connected client
  try {
    const status = whatsappClientService.getStatus();
    socket.emit('whatsapp:status', status);
  } catch (error) {
    console.error('Error getting status for new client:', error);
  }

  // Handle health check request from client
  socket.on('whatsapp:health_check', (data) => {
    try {
      console.log('🏥 Health check requested');
      const isReady = whatsappClientService ? whatsappClientService.isReady : false;
      socket.emit('whatsapp:health_response', {
        healthy: true,
        timestamp: new Date().toISOString(),
        whatsappReady: isReady
      });
    } catch (error) {
      console.error('Health check error:', error);
      socket.emit('whatsapp:health_response', {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle get status request from client
  socket.on('whatsapp:get_status', async (data) => {
    try {
      console.log('📊 Status requested');
      const status = await whatsappClientService.getStatus();
      socket.emit('whatsapp:status_response', {
        isConnected: status.isReady || false,
        status: status.status || 'unknown',
        phoneNumber: status.phoneNumber || null,
        message: status.message || '',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get status error:', error);
      socket.emit('whatsapp:status_response', {
        isConnected: false,
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle WhatsApp initialization request from client
  socket.on('whatsapp:initialize', async (data, callback) => {
    try {
      console.log('📱 Client requested WhatsApp initialization');

      // Send success response via callback immediately
      if (callback && typeof callback === 'function') {
        callback({
          success: true,
          message: 'WhatsApp initialization started successfully'
        });
      }

      // Start initialization asynchronously (don't await)
      whatsappClientService.initialize().catch(error => {
        console.error('Error during WhatsApp initialization:', error);
        socket.emit('whatsapp:error', {
          message: 'Failed to initialize WhatsApp',
          error: error.message
        });
      });

    } catch (error) {
      console.error('Error initializing WhatsApp from socket:', error);

      // Send error response via callback
      if (callback && typeof callback === 'function') {
        callback({
          success: false,
          message: 'Failed to initialize WhatsApp',
          error: error.message
        });
      }

      socket.emit('whatsapp:error', {
        message: 'Failed to initialize WhatsApp',
        error: error.message
      });
    }
  });

  // Handle logout request from client
  socket.on('whatsapp:logout', async () => {
    try {
      console.log('🚪 Client requested WhatsApp logout');
      await whatsappClientService.logout();
    } catch (error) {
      console.error('Error logging out WhatsApp from socket:', error);
      socket.emit('whatsapp:error', {
        message: 'Failed to logout from WhatsApp',
        error: error.message
      });
    }
  });

  // Handle send message request from client
  socket.on('whatsapp:send_message', async (data) => {
    try {
      const { to, message, options = {} } = data;
      console.log(`📤 Client requested to send message to ${to}`);

      const result = await whatsappClientService.sendMessage(to, message, options);

      socket.emit('whatsapp:message_sent', {
        success: true,
        messageId: result.messageId,
        to,
        message,
        timestamp: result.timestamp
      });
    } catch (error) {
      console.error('Error sending message from socket:', error);
      socket.emit('whatsapp:error', {
        message: 'Failed to send message',
        error: error.message
      });
    }
  });

  // Handle get contacts request from client
  socket.on('whatsapp:get_contacts', async () => {
    try {
      console.log('📋 Client requested contacts');
      const contacts = await whatsappClientService.getContacts();
      socket.emit('whatsapp:contacts', contacts);
    } catch (error) {
      console.error('Error getting contacts from socket:', error);
      socket.emit('whatsapp:error', {
        message: 'Failed to get contacts',
        error: error.message
      });
    }
  });

  // Handle generate QR code request from client
  socket.on('whatsapp:generate_qr', async (data, callback) => {
    try {
      console.log('🔄 Client requested QR code generation');

      // Send success response via callback immediately
      if (callback && typeof callback === 'function') {
        callback({
          success: true,
          message: 'QR code generation started successfully'
        });
      }

      // Start QR generation asynchronously
      whatsappClientService.generateQRCode().catch(error => {
        console.error('Error during QR code generation:', error);
        socket.emit('whatsapp:error', {
          message: 'Failed to generate QR code',
          error: error.message
        });
      });

    } catch (error) {
      console.error('Error generating QR code from socket:', error);

      // Send error response via callback
      if (callback && typeof callback === 'function') {
        callback({
          success: false,
          message: 'Failed to generate QR code',
          error: error.message
        });
      }

      socket.emit('whatsapp:error', {
        message: 'Failed to generate QR code',
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log('🚀 WhatsApp Backend Server (whatsapp-web.js) running on port', PORT);
  console.log('📱 Frontend URL:', process.env.FRONTEND_URL || "http://localhost:5173");
  console.log('🔗 Health check:', `http://localhost:${PORT}/health`);
  console.log('📡 Socket.IO enabled for real-time communication');
  console.log('🗄️  Supabase connected for data persistence');

  // Auto-initialize WhatsApp client after server starts - DISABLED for now
  // setTimeout(async () => {
  //   try {
  //     console.log('🔄 Auto-initializing WhatsApp client...');
  //     await whatsappClientService.initialize();
  //   } catch (error) {
  //     console.error('❌ Auto-initialization failed:', error.message);
  //     console.log('💡 You can manually initialize via API or frontend');
  //   }
  // }, 2000);

  console.log('💡 WhatsApp client auto-initialization disabled. You can manually initialize via API or frontend');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    // Close WhatsApp client
    if (whatsappClientService) {
      console.log('🔄 Closing WhatsApp client...');
      await whatsappClientService.destroy();
      console.log('✅ WhatsApp client closed');
    }

    // Close server
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;