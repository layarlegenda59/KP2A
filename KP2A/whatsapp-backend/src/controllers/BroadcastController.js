const BroadcastService = require('../services/BroadcastService');
const ContactService = require('../services/ContactService');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

class BroadcastController {
  constructor(broadcastSender = null) {
    this.broadcastService = new BroadcastService();
    this.contactService = new ContactService();
    this.broadcastSender = broadcastSender;
  }

  /**
   * Create a new broadcast
   */
  createBroadcast = async (req, res) => {
    try {
      const { title, message, recipients, scheduled_at, status } = req.body;

      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message and recipients are required'
        });
      }

      if (message.length > 4096) {
        return res.status(400).json({
          success: false,
          message: 'Message too long (max 4096 characters)'
        });
      }

      // Use the existing admin user ID as default when no user is authenticated
      // This is the admin@kp2a.com user that already exists in the system
      const defaultUserId = '3d331e32-c10b-42ae-a230-cdfeac3dfbc9';
      const createdBy = req.user?.id || defaultUserId;

      // Create broadcast with proper field mapping
      const broadcast = await this.broadcastService.createBroadcast({
        title: title || 'Untitled Broadcast',
        message,
        recipients,
        scheduledFor: scheduled_at,
        status: status || 'pending',
        createdBy: createdBy
      });

      // If status is 'pending' and no scheduled time, start sending immediately
      if (status === 'pending' && !scheduled_at && this.broadcastSender) {
        try {
          console.log(`🚀 Starting immediate broadcast for ID: ${broadcast.id}`);
          
          // Start the broadcast processor if not already running
          if (!this.broadcastSender.isProcessing) {
            await this.broadcastSender.startBroadcastProcessor();
          }
          
          // Optionally trigger immediate processing for this specific broadcast
          setTimeout(async () => {
            try {
              await this.broadcastSender.sendImmediateBroadcast(broadcast.id);
            } catch (error) {
              console.error('Error in immediate broadcast:', error);
            }
          }, 1000); // Small delay to ensure database is updated
          
        } catch (error) {
          console.error('Error starting immediate broadcast:', error);
          // Don't fail the request, just log the error
        }
      }

      res.status(201).json({
        success: true,
        data: broadcast
      });
    } catch (error) {
      console.error('BroadcastController.createBroadcast error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get broadcasts with pagination
   */
  getBroadcasts = async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      // Use the existing admin user ID as default when no user is authenticated
      const defaultUserId = '3d331e32-c10b-42ae-a230-cdfeac3dfbc9';
      const userId = req.user?.id || defaultUserId;
      
      const result = await this.broadcastService.getBroadcasts(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('BroadcastController.getBroadcasts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get broadcast by ID
   */
  getBroadcast = async (req, res) => {
    try {
      const { id } = req.params;
      
      const broadcast = await this.broadcastService.getBroadcast(id);
      
      if (!broadcast) {
        return res.status(404).json({
          success: false,
          message: 'Broadcast not found'
        });
      }

      res.json({
        success: true,
        data: broadcast
      });
    } catch (error) {
      console.error('BroadcastController.getBroadcast error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Update broadcast status
   */
  updateBroadcastStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'sending', 'completed', 'failed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const broadcast = await this.broadcastService.updateBroadcastStatus(id, status);

      res.json({
        success: true,
        data: broadcast
      });
    } catch (error) {
      console.error('BroadcastController.updateBroadcastStatus error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get broadcast recipients
   */
  getBroadcastRecipients = async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, status } = req.query;

      const result = await this.broadcastService.getBroadcastRecipients(id, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('BroadcastController.getBroadcastRecipients error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Update recipient status
   */
  updateRecipientStatus = async (req, res) => {
    try {
      const { broadcastId, recipientId } = req.params;
      const { status, errorMessage } = req.body;

      if (!['pending', 'sent', 'delivered', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const recipient = await this.broadcastService.updateRecipientStatus(
        broadcastId,
        recipientId,
        status,
        errorMessage
      );

      res.json({
        success: true,
        data: recipient
      });
    } catch (error) {
      console.error('BroadcastController.updateRecipientStatus error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get broadcast analytics
   */
  getBroadcastAnalytics = async (req, res) => {
    try {
      const { id } = req.params;
      
      const analytics = await this.broadcastService.getBroadcastAnalytics(id);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('BroadcastController.getBroadcastAnalytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get all contacts
   */
  getContacts = async (req, res) => {
    try {
      const { page = 1, limit = 50, search, group } = req.query;

      const result = await this.contactService.getContacts({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        group
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('BroadcastController.getContacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Helper function to determine if an error is a client error (400) or server error (500)
   */
  isClientError(error) {
    const clientErrorMessages = [
      'Contact with this phone number already exists',
      'Name and phone are required',
      'Invalid phone number format',
      'Name is required'
    ];
    
    return clientErrorMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Create contact
   */
  createContact = async (req, res) => {
    try {
      const { name, phone, groupId } = req.body;

      const contact = await this.contactService.createContact({
        name,
        phone,
        groupId
      });

      res.status(201).json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error('BroadcastController.createContact error:', error);
      
      const statusCode = this.isClientError(error) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Update contact
   */
  updateContact = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, groupId, isValid } = req.body;

      const contact = await this.contactService.updateContact(id, {
        name,
        phone,
        groupId,
        isValid
      });

      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      console.error('BroadcastController.updateContact error:', error);
      
      const statusCode = this.isClientError(error) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Delete contact
   */
  deleteContact = async (req, res) => {
    try {
      const { id } = req.params;

      await this.contactService.deleteContact(id);

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error) {
      console.error('BroadcastController.deleteContact error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Import contacts from CSV
   */
  importContacts = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      const { groupId } = req.body;
      
      const result = await this.contactService.importContactsFromCSV(
        req.file.buffer,
        groupId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('BroadcastController.importContacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Export contacts to CSV
   */
  exportContacts = async (req, res) => {
    try {
      const { groupId } = req.query;
      
      const csv = await this.contactService.exportContactsToCSV({ groupId });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
      res.send(csv);
    } catch (error) {
      console.error('BroadcastController.exportContacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Import members from members table to contacts
   */
  importMembersToContacts = async (req, res) => {
    try {
      console.log('🔄 Starting import members to contacts...');
      
      const result = await this.contactService.importMembersToContacts();
      
      console.log('✅ Import members completed:', result);
      
      res.json({
        success: true,
        message: `Successfully imported ${result.imported} members to contacts`,
        data: {
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
          details: result.details
        }
      });
    } catch (error) {
      console.error('BroadcastController.importMembersToContacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to import members to contacts'
      });
    }
  };

  /**
   * Get contact groups
   */
  getContactGroups = async (req, res) => {
    try {
      const groups = await this.contactService.getContactGroups();

      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('BroadcastController.getContactGroups error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Create contact group
   */
  createContactGroup = async (req, res) => {
    try {
      const { name, description } = req.body;

      const group = await this.contactService.createContactGroup({
        name,
        description,
        createdBy: req.user?.id || null
      });

      res.status(201).json({
        success: true,
        data: group
      });
    } catch (error) {
      console.error('BroadcastController.createContactGroup error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Update contact group
   */
  updateContactGroup = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const group = await this.contactService.updateContactGroup(id, {
        name,
        description
      });

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      console.error('BroadcastController.updateContactGroup error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Delete contact group
   */
  deleteContactGroup = async (req, res) => {
    try {
      const { id } = req.params;

      await this.contactService.deleteContactGroup(id);

      res.json({
        success: true,
        message: 'Contact group deleted successfully'
      });
    } catch (error) {
      console.error('BroadcastController.deleteContactGroup error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Send immediate broadcast
   */
  sendImmediateBroadcast = async (req, res) => {
    try {
      const { id } = req.params;

      if (!this.broadcastSender) {
        return res.status(500).json({
          success: false,
          message: 'Broadcast sender not available'
        });
      }

      await this.broadcastSender.sendImmediateBroadcast(id);

      res.json({
        success: true,
        message: 'Broadcast sent successfully'
      });
    } catch (error) {
      console.error('BroadcastController.sendImmediateBroadcast error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Get broadcast sender status
   */
  getBroadcastSenderStatus = async (req, res) => {
    try {
      if (!this.broadcastSender) {
        return res.status(500).json({
          success: false,
          message: 'Broadcast sender not available'
        });
      }

      const status = this.broadcastSender.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('BroadcastController.getBroadcastSenderStatus error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Send test message
   */
  sendTestMessage = async (req, res) => {
    try {
      const { phone, message } = req.body;

      console.log(`📤 Test message request: ${phone} - "${message?.substring(0, 50)}..."`);

      if (!phone || !message) {
        return res.status(400).json({
          success: false,
          message: 'Phone and message are required',
          details: {
            phone: phone ? 'provided' : 'missing',
            message: message ? 'provided' : 'missing'
          }
        });
      }

      if (!this.broadcastSender) {
        return res.status(500).json({
          success: false,
          message: 'Broadcast sender not available',
          details: {
            error: 'Service initialization issue',
            suggestion: 'Please restart the server or check service configuration'
          }
        });
      }

      // Call the improved sendTestMessage method
      const result = await this.broadcastSender.sendTestMessage(phone, message);

      // Return the detailed result from the service
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('BroadcastController.sendTestMessage error:', error);
      
      // Try to parse detailed error information
      let errorDetails;
      try {
        errorDetails = JSON.parse(error.message);
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorDetails = {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
          errorType: 'unknown_error'
        };
      }

      // Return appropriate status code based on error type
      let statusCode = 500;
      if (errorDetails.errorType === 'invalid_phone_format') {
        statusCode = 400;
      } else if (errorDetails.errorType === 'connection_not_ready') {
        statusCode = 503; // Service Unavailable
      }

      res.status(statusCode).json({
        success: false,
        error: errorDetails
      });
    }
  };

  /**
   * Get dashboard statistics
   */
  getDashboard = async (req, res) => {
    try {
      let broadcasts;
      
      try {
        // Try to get broadcast statistics from database
        broadcasts = await this.broadcastService.getBroadcasts({ page: 1, limit: 1000 });
      } catch (dbError) {
        console.log('Database not available, returning mock data for dashboard');
        // Return mock data when database is not available
        broadcasts = {
          total: 15,
          data: [
            {
              id: '1',
              message: 'Welcome to our WhatsApp Broadcast System! This is a sample broadcast message.',
              status: 'completed',
              recipients: [
                { status: 'delivered' },
                { status: 'delivered' },
                { status: 'failed' }
              ],
              createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              scheduledFor: null
            },
            {
              id: '2',
              message: 'Important update: Our services will be temporarily unavailable for maintenance.',
              status: 'pending',
              recipients: [
                { status: 'pending' },
                { status: 'pending' }
              ],
              createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              scheduledFor: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
            },
            {
              id: '3',
              message: 'Thank you for using our service. We appreciate your feedback!',
              status: 'failed',
              recipients: [
                { status: 'failed' },
                { status: 'delivered' }
              ],
              createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
              scheduledFor: null
            }
          ]
        };
      }
      
      // Calculate statistics
      const totalBroadcasts = broadcasts.total || 0;
      const completedBroadcasts = broadcasts.data?.filter(b => b.status === 'completed').length || 0;
      const pendingBroadcasts = broadcasts.data?.filter(b => b.status === 'pending').length || 0;
      const failedBroadcasts = broadcasts.data?.filter(b => b.status === 'failed').length || 0;
      
      // Calculate total recipients
      const totalRecipients = broadcasts.data?.reduce((sum, broadcast) => {
        return sum + (broadcast.recipients?.length || 0);
      }, 0) || 0;

      // Calculate success rate
      const successfulDeliveries = broadcasts.data?.reduce((sum, broadcast) => {
        return sum + (broadcast.recipients?.filter(r => r.status === 'delivered').length || 0);
      }, 0) || 0;

      const successRate = totalRecipients > 0 ? ((successfulDeliveries / totalRecipients) * 100).toFixed(1) : 0;

      // Get recent broadcasts (last 7 days)
      const recentBroadcasts = broadcasts.data?.filter(broadcast => {
        const broadcastDate = new Date(broadcast.createdAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return broadcastDate >= sevenDaysAgo;
      }) || [];

      const dashboardData = {
        statistics: {
          totalBroadcasts,
          completedBroadcasts,
          pendingBroadcasts,
          failedBroadcasts,
          totalRecipients,
          successfulDeliveries,
          successRate: parseFloat(successRate)
        },
        recentActivity: recentBroadcasts.slice(0, 10).map(broadcast => ({
          id: broadcast.id,
          message: broadcast.message.substring(0, 100) + (broadcast.message.length > 100 ? '...' : ''),
          status: broadcast.status,
          recipientCount: broadcast.recipients?.length || 0,
          createdAt: broadcast.createdAt,
          scheduledFor: broadcast.scheduledFor
        })),
        chartData: {
          // Last 7 days broadcast activity
          dailyBroadcasts: this.generateDailyBroadcastData(recentBroadcasts),
          statusDistribution: [
            { name: 'Completed', value: completedBroadcasts, color: '#10B981' },
            { name: 'Pending', value: pendingBroadcasts, color: '#F59E0B' },
            { name: 'Failed', value: failedBroadcasts, color: '#EF4444' }
          ]
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('BroadcastController.getDashboard error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Generate daily broadcast data for charts
   */
  generateDailyBroadcastData = (broadcasts) => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayBroadcasts = broadcasts.filter(broadcast => {
        const broadcastDate = new Date(broadcast.createdAt).toISOString().split('T')[0];
        return broadcastDate === dateStr;
      });

      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        broadcasts: dayBroadcasts.length,
        recipients: dayBroadcasts.reduce((sum, b) => sum + (b.recipients?.length || 0), 0)
      });
    }
    
    return last7Days;
  };

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return upload.single('file');
  }
}

module.exports = BroadcastController;