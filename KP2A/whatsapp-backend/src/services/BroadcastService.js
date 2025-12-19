const { createClient } = require('@supabase/supabase-js');

class BroadcastService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Create a new broadcast
   * @param {Object} broadcastData - Broadcast data
   * @param {string} broadcastData.title - Broadcast title
   * @param {string} broadcastData.message - Message content
   * @param {string[]} broadcastData.recipients - Array of phone numbers or contact IDs
   * @param {string} broadcastData.createdBy - User ID creating the broadcast
   * @param {string} broadcastData.scheduledFor - Optional scheduled time
   * @param {string} broadcastData.status - Broadcast status
   * @returns {Promise<Object>} Created broadcast
   */
  async createBroadcast({ title, message, recipients, createdBy, scheduledFor = null, status = 'pending' }) {
    try {
      // Validate input
      if (!message || !recipients || !createdBy) {
        throw new Error('Message, recipients, and createdBy are required');
      }

      if (recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }

      if (message.length > 4096) {
        throw new Error('Message exceeds WhatsApp limit of 4096 characters');
      }

      // Create broadcast record
      const { data: broadcast, error: broadcastError } = await this.supabase
        .from('broadcasts')
        .insert({
          title: title || 'Untitled Broadcast',
          message,
          created_by: createdBy,
          total_recipients: recipients.length,
          scheduled_at: scheduledFor,
          status: status
        })
        .select()
        .single();

      if (broadcastError) {
        throw new Error(`Failed to create broadcast: ${broadcastError.message}`);
      }

      // Process recipients and create broadcast_recipients records
      const recipientRecords = await this.processRecipients(broadcast.id, recipients);

      // Update total recipients count
      await this.supabase
        .from('broadcasts')
        .update({ total_recipients: recipientRecords.length })
        .eq('id', broadcast.id);

      return {
        ...broadcast,
        recipients: recipientRecords
      };
    } catch (error) {
      console.error('BroadcastService.createBroadcast error:', error);
      throw error;
    }
  }

  /**
   * Process recipients and create broadcast_recipients records
   * @param {string} broadcastId - Broadcast ID
   * @param {string[]} recipients - Array of phone numbers or contact IDs
   * @returns {Promise<Array>} Created recipient records
   */
  async processRecipients(broadcastId, recipients) {
    try {
      const recipientRecords = [];

      for (const recipient of recipients) {
        let phone = recipient;
        let contactId = null;

        // Check if recipient is a contact ID (UUID format) or phone number
        if (this.isUUID(recipient)) {
          // Get contact details
          const { data: contact } = await this.supabase
            .from('contacts')
            .select('phone, id')
            .eq('id', recipient)
            .single();

          if (contact) {
            phone = contact.phone;
            contactId = contact.id;
          }
        } else {
          // Try to find existing contact by phone
          const { data: contact } = await this.supabase
            .from('contacts')
            .select('id')
            .eq('phone', recipient)
            .single();

          if (contact) {
            contactId = contact.id;
          }
        }

        // Validate phone number format
        if (!this.isValidPhoneNumber(phone)) {
          console.warn(`Invalid phone number: ${phone}`);
          continue;
        }

        recipientRecords.push({
          broadcast_id: broadcastId,
          contact_id: contactId,
          phone: phone,
          status: 'pending'
        });
      }

      // Insert all recipient records
      const { data: insertedRecords, error } = await this.supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)
        .select();

      if (error) {
        throw new Error(`Failed to create recipient records: ${error.message}`);
      }

      return insertedRecords;
    } catch (error) {
      console.error('BroadcastService.processRecipients error:', error);
      throw error;
    }
  }

  /**
   * Get broadcast by ID
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Broadcast with recipients
   */
  async getBroadcast(broadcastId, userId) {
    try {
      const { data: broadcast, error: broadcastError } = await this.supabase
        .from('broadcasts')
        .select(`
          *,
          broadcast_recipients (
            id,
            contact_id,
            phone,
            status,
            error_message,
            sent_at,
            delivered_at,
            contacts (
              name
            )
          )
        `)
        .eq('id', broadcastId)
        .eq('created_by', userId)
        .single();

      if (broadcastError) {
        throw new Error(`Failed to get broadcast: ${broadcastError.message}`);
      }

      return broadcast;
    } catch (error) {
      console.error('BroadcastService.getBroadcast error:', error);
      throw error;
    }
  }

  /**
   * Get broadcast by ID (for broadcast processor - no user restriction)
   * @param {string} broadcastId - Broadcast ID
   * @returns {Promise<Object>} Broadcast with recipients
   */
  async getBroadcastById(broadcastId) {
    try {
      const { data: broadcast, error: broadcastError } = await this.supabase
        .from('broadcasts')
        .select(`
          *,
          broadcast_recipients (
            id,
            contact_id,
            phone,
            status,
            error_message,
            sent_at,
            delivered_at,
            contacts (
              name
            )
          )
        `)
        .eq('id', broadcastId)
        .single();

      if (broadcastError) {
        throw new Error(`Failed to get broadcast: ${broadcastError.message}`);
      }

      return broadcast;
    } catch (error) {
      console.error('BroadcastService.getBroadcastById error:', error);
      throw error;
    }
  }

  /**
   * Get broadcasts for a user with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Broadcasts with pagination info
   */
  async getBroadcasts(userId, { page = 1, limit = 20, status = null } = {}) {
    try {
      let query = this.supabase
        .from('broadcasts')
        .select('*', { count: 'exact' })
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const offset = (page - 1) * limit;
      const { data: broadcasts, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get broadcasts: ${error.message}`);
      }

      return {
        broadcasts,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('BroadcastService.getBroadcasts error:', error);
      throw error;
    }
  }

  /**
   * Get all pending broadcasts (for broadcast processor)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Pending broadcasts
   */
  async getPendingBroadcasts({ page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      const { data: broadcasts, error, count } = await this.supabase
        .from('broadcasts')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true }) // Process older broadcasts first
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get pending broadcasts: ${error.message}`);
      }

      return {
        broadcasts,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('BroadcastService.getPendingBroadcasts error:', error);
      throw error;
    }
  }

  /**
   * Update broadcast status
   * @param {string} broadcastId - Broadcast ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated broadcast
   */
  async updateBroadcastStatus(broadcastId, status) {
    try {
      const updateData = { status };
      
      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: broadcast, error } = await this.supabase
        .from('broadcasts')
        .update(updateData)
        .eq('id', broadcastId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update broadcast status: ${error.message}`);
      }

      return broadcast;
    } catch (error) {
      console.error('BroadcastService.updateBroadcastStatus error:', error);
      throw error;
    }
  }

  /**
   * Update recipient status
   * @param {string} recipientId - Recipient ID
   * @param {string} status - New status
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} Updated recipient
   */
  async updateRecipientStatus(recipientId, status, errorMessage = null) {
    try {
      const updateData = { status };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'failed' && errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { data: recipient, error } = await this.supabase
        .from('broadcast_recipients')
        .update(updateData)
        .eq('id', recipientId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update recipient status: ${error.message}`);
      }

      return recipient;
    } catch (error) {
      console.error('BroadcastService.updateRecipientStatus error:', error);
      throw error;
    }
  }

  /**
   * Get pending recipients for a broadcast
   * @param {string} broadcastId - Broadcast ID
   * @returns {Promise<Array>} Pending recipients
   */
  async getPendingRecipients(broadcastId) {
    try {
      const { data: recipients, error } = await this.supabase
        .from('broadcast_recipients')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .eq('status', 'pending')
        .order('id');

      if (error) {
        throw new Error(`Failed to get pending recipients: ${error.message}`);
      }

      return recipients;
    } catch (error) {
      console.error('BroadcastService.getPendingRecipients error:', error);
      throw error;
    }
  }

  /**
   * Update broadcast counts
   * @param {string} broadcastId - Broadcast ID
   * @returns {Promise<Object>} Updated broadcast
   */
  async updateBroadcastCounts(broadcastId) {
    try {
      // Get counts for each status
      const { data: counts, error: countError } = await this.supabase
        .from('broadcast_recipients')
        .select('status')
        .eq('broadcast_id', broadcastId);

      if (countError) {
        throw new Error(`Failed to get recipient counts: ${countError.message}`);
      }

      const sentCount = counts.filter(r => r.status === 'sent' || r.status === 'delivered').length;
      const failedCount = counts.filter(r => r.status === 'failed').length;

      // Update broadcast with new counts
      const { data: broadcast, error } = await this.supabase
        .from('broadcasts')
        .update({
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', broadcastId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update broadcast counts: ${error.message}`);
      }

      return broadcast;
    } catch (error) {
      console.error('BroadcastService.updateBroadcastCounts error:', error);
      throw error;
    }
  }

  /**
   * Check if string is UUID format
   * @param {string} str - String to check
   * @returns {boolean} True if UUID format
   */
  isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  isValidPhoneNumber(phone) {
    // Basic validation for Indonesian phone numbers
    const phoneRegex = /^(\+?62|0)8[1-9][0-9]{6,10}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = BroadcastService;