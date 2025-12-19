const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');
const { Readable } = require('stream');

class ContactService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Get all contacts with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Contacts with pagination info
   */
  async getContacts({ page = 1, limit = 50, search = '', group = null } = {}) {
    try {
      let query = this.supabase
        .from('contacts')
        .select(`
          *,
          contact_groups (
            id,
            name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Apply group filter
      if (group) {
        query = query.eq('group_id', group);
      }

      const offset = (page - 1) * limit;
      const { data: contacts, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to get contacts: ${error.message}`);
      }

      return {
        contacts,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('ContactService.getContacts error:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact data
   */
  async getContact(contactId) {
    try {
      const { data: contact, error } = await this.supabase
        .from('contacts')
        .select(`
          *,
          contact_groups (
            id,
            name,
            description
          )
        `)
        .eq('id', contactId)
        .single();

      if (error) {
        throw new Error(`Failed to get contact: ${error.message}`);
      }

      return contact;
    } catch (error) {
      console.error('ContactService.getContact error:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} Created contact
   */
  async createContact({ name, phone, groupId = null }) {
    try {
      // Validate input
      if (!name || !phone) {
        throw new Error('Name and phone are required');
      }

      if (!this.isValidPhoneNumber(phone)) {
        throw new Error('Invalid phone number format');
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phone);

      const { data: contact, error } = await this.supabase
        .from('contacts')
        .insert({
          name: name.trim(),
          phone: normalizedPhone,
          group_id: groupId,
          is_valid: true,
          last_validated: new Date().toISOString()
        })
        .select(`
          *,
          contact_groups (
            id,
            name
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Contact with this phone number already exists');
        }
        throw new Error(`Failed to create contact: ${error.message}`);
      }

      return contact;
    } catch (error) {
      console.error('ContactService.createContact error:', error);
      throw error;
    }
  }

  /**
   * Update contact
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, { name, phone, groupId, isValid }) {
    try {
      const updateData = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (phone !== undefined) {
        if (!this.isValidPhoneNumber(phone)) {
          throw new Error('Invalid phone number format');
        }
        updateData.phone = this.normalizePhoneNumber(phone);
      }

      if (groupId !== undefined) {
        updateData.group_id = groupId;
      }

      if (isValid !== undefined) {
        updateData.is_valid = isValid;
        updateData.last_validated = new Date().toISOString();
      }

      const { data: contact, error } = await this.supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .select(`
          *,
          contact_groups (
            id,
            name
          )
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Contact with this phone number already exists');
        }
        throw new Error(`Failed to update contact: ${error.message}`);
      }

      return contact;
    } catch (error) {
      console.error('ContactService.updateContact error:', error);
      throw error;
    }
  }

  /**
   * Delete contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteContact(contactId) {
    try {
      const { error } = await this.supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        throw new Error(`Failed to delete contact: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ContactService.deleteContact error:', error);
      throw error;
    }
  }

  /**
   * Import contacts from CSV
   * @param {Buffer} csvBuffer - CSV file buffer
   * @param {string} groupId - Optional group ID to assign contacts
   * @returns {Promise<Object>} Import results
   */
  async importContactsFromCSV(csvBuffer, groupId = null) {
    try {
      const results = {
        imported: 0,
        failed: 0,
        errors: []
      };

      const contacts = [];
      const stream = Readable.from(csvBuffer);

      return new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (row) => {
            // Expected CSV format: name,phone
            const name = row.name || row.Name || row.NAME;
            const phone = row.phone || row.Phone || row.PHONE;

            if (name && phone) {
              contacts.push({ name: name.trim(), phone: phone.trim() });
            }
          })
          .on('end', async () => {
            try {
              for (const contactData of contacts) {
                try {
                  await this.createContact({
                    name: contactData.name,
                    phone: contactData.phone,
                    groupId
                  });
                  results.imported++;
                } catch (error) {
                  results.failed++;
                  results.errors.push(`${contactData.name} (${contactData.phone}): ${error.message}`);
                }
              }
              resolve(results);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          });
      });
    } catch (error) {
      console.error('ContactService.importContactsFromCSV error:', error);
      throw error;
    }
  }

  /**
   * Export contacts to CSV format
   * @param {Object} options - Export options
   * @returns {Promise<string>} CSV string
   */
  async exportContactsToCSV({ groupId = null } = {}) {
    try {
      let query = this.supabase
        .from('contacts')
        .select(`
          name,
          phone,
          contact_groups (
            name
          ),
          is_valid,
          created_at
        `)
        .order('name');

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data: contacts, error } = await query;

      if (error) {
        throw new Error(`Failed to export contacts: ${error.message}`);
      }

      // Generate CSV
      let csv = 'Name,Phone,Group,Valid,Created At\n';
      
      for (const contact of contacts) {
        const groupName = contact.contact_groups?.name || 'No Group';
        const isValid = contact.is_valid ? 'Yes' : 'No';
        const createdAt = new Date(contact.created_at).toLocaleDateString();
        
        csv += `"${contact.name}","${contact.phone}","${groupName}","${isValid}","${createdAt}"\n`;
      }

      return csv;
    } catch (error) {
      console.error('ContactService.exportContactsToCSV error:', error);
      throw error;
    }
  }

  /**
   * Get all contact groups
   * @returns {Promise<Array>} Contact groups
   */
  async getContactGroups() {
    try {
      const { data: groups, error } = await this.supabase
        .from('contact_groups')
        .select(`
          *,
          contacts (count)
        `)
        .order('name');

      if (error) {
        throw new Error(`Failed to get contact groups: ${error.message}`);
      }

      return groups;
    } catch (error) {
      console.error('ContactService.getContactGroups error:', error);
      throw error;
    }
  }

  /**
   * Create contact group
   * @param {Object} groupData - Group data
   * @returns {Promise<Object>} Created group
   */
  async createContactGroup({ name, description, createdBy }) {
    try {
      if (!name) {
        throw new Error('Name is required');
      }

      const { data: group, error } = await this.supabase
        .from('contact_groups')
        .insert({
          name: name.trim(),
          description: description?.trim(),
          created_by: createdBy || null
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create contact group: ${error.message}`);
      }

      return group;
    } catch (error) {
      console.error('ContactService.createContactGroup error:', error);
      throw error;
    }
  }

  /**
   * Update contact group
   * @param {string} groupId - Group ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated group
   */
  async updateContactGroup(groupId, { name, description }) {
    try {
      const updateData = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (description !== undefined) {
        updateData.description = description?.trim();
      }

      const { data: group, error } = await this.supabase
        .from('contact_groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update contact group: ${error.message}`);
      }

      return group;
    } catch (error) {
      console.error('ContactService.updateContactGroup error:', error);
      throw error;
    }
  }

  /**
   * Delete contact group
   * @param {string} groupId - Group ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteContactGroup(groupId) {
    try {
      // First, update contacts in this group to have no group
      await this.supabase
        .from('contacts')
        .update({ group_id: null })
        .eq('group_id', groupId);

      // Then delete the group
      const { error } = await this.supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        throw new Error(`Failed to delete contact group: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ContactService.deleteContactGroup error:', error);
      throw error;
    }
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

  /**
   * Normalize phone number to standard format
   * @param {string} phone - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    
    // Handle Indonesian phone numbers
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    } else if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    
    return normalized;
  }

  /**
   * Import members from members table to contacts
   * @returns {Promise<Object>} Import results
   */
  async importMembersToContacts() {
    try {
      console.log('🔄 Starting import members to contacts...');
      
      // Get all active members
      const { data: members, error: membersError } = await this.supabase
        .from('members')
        .select('id_anggota, nama_lengkap, no_hp')
        .eq('status_keanggotaan', 'aktif');

      if (membersError) {
        throw new Error(`Failed to get members: ${membersError.message}`);
      }

      console.log(`📋 Found ${members.length} active members`);

      // Get existing contacts to avoid duplicates
      const { data: existingContacts, error: contactsError } = await this.supabase
        .from('contacts')
        .select('phone');

      if (contactsError) {
        throw new Error(`Failed to get existing contacts: ${contactsError.message}`);
      }

      const existingPhones = new Set(existingContacts.map(c => c.phone));
      console.log(`📞 Found ${existingPhones.size} existing contacts`);

      // Get or create default contact group
      let { data: defaultGroup, error: groupError } = await this.supabase
        .from('contact_groups')
        .select('id')
        .eq('name', 'Default')
        .single();

      if (groupError && groupError.code === 'PGRST116') {
        // Create default group if it doesn't exist
        const { data: newGroup, error: createGroupError } = await this.supabase
          .from('contact_groups')
          .insert({
            name: 'Default',
            description: 'Default contact group for imported members'
          })
          .select('id')
          .single();

        if (createGroupError) {
          throw new Error(`Failed to create default group: ${createGroupError.message}`);
        }
        defaultGroup = newGroup;
      } else if (groupError) {
        throw new Error(`Failed to get default group: ${groupError.message}`);
      }

      const defaultGroupId = defaultGroup.id;
      console.log(`📁 Using default group ID: ${defaultGroupId}`);

      // Process members and prepare contacts data
      const contactsToImport = [];
      const results = {
        imported: 0,
        skipped: 0,
        errors: 0,
        details: []
      };

      for (const member of members) {
        try {
          // Validate and clean phone number
          if (!member.no_hp) {
            results.skipped++;
            results.details.push({
              name: member.nama_lengkap,
              reason: 'No phone number'
            });
            continue;
          }

          const cleanPhone = this.normalizePhoneNumber(member.no_hp);
          
          if (!this.isValidPhoneNumber(cleanPhone)) {
            results.skipped++;
            results.details.push({
              name: member.nama_lengkap,
              phone: member.no_hp,
              reason: 'Invalid phone number format'
            });
            continue;
          }

          // Check if phone already exists
          if (existingPhones.has(cleanPhone)) {
            results.skipped++;
            results.details.push({
              name: member.nama_lengkap,
              phone: cleanPhone,
              reason: 'Phone number already exists'
            });
            continue;
          }

          // Add to import list
          contactsToImport.push({
            name: member.nama_lengkap,
            phone: cleanPhone,
            group_id: defaultGroupId,
            is_valid: true
          });

          // Add to existing phones set to avoid duplicates in this batch
          existingPhones.add(cleanPhone);

        } catch (error) {
          results.errors++;
          results.details.push({
            name: member.nama_lengkap,
            phone: member.no_hp,
            reason: `Processing error: ${error.message}`
          });
        }
      }

      console.log(`📊 Prepared ${contactsToImport.length} contacts for import`);

      // Import contacts in batches
      if (contactsToImport.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < contactsToImport.length; i += batchSize) {
          const batch = contactsToImport.slice(i, i + batchSize);
          
          const { error: insertError } = await this.supabase
            .from('contacts')
            .insert(batch);

          if (insertError) {
            console.error(`❌ Batch insert error:`, insertError);
            results.errors += batch.length;
            batch.forEach(contact => {
              results.details.push({
                name: contact.name,
                phone: contact.phone,
                reason: `Insert error: ${insertError.message}`
              });
            });
          } else {
            results.imported += batch.length;
            console.log(`✅ Imported batch of ${batch.length} contacts`);
          }
        }
      }

      console.log('📈 Import summary:', {
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors
      });

      return results;

    } catch (error) {
      console.error('ContactService.importMembersToContacts error:', error);
      throw error;
    }
  }
}

module.exports = ContactService;