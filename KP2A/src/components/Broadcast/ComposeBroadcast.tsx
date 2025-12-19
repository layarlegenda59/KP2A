import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { 
  Send, 
  Users, 
  Calendar, 
  MessageSquare, 
  X,
  Plus,
  Search,
  Check,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  group_id: string | null;
  group_name?: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
}

interface SelectedRecipient {
  type: 'contact' | 'group';
  id: string;
  name: string;
  phone?: string;
  count?: number;
}

const ComposeBroadcast: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/broadcast/contacts/all?limit=100');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data?.contacts)) {
        setContacts(data.data.contacts);
      } else {
        console.warn('Invalid contacts data received:', data);
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      setContacts([]); // Ensure contacts is always an array
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/broadcast/groups');
      const data = await response.json();
      
      // API returns {success: true, data: Array} format
      if (data.success && Array.isArray(data.data)) {
        setGroups(data.data);
      } else {
        console.warn('Invalid groups data received:', data);
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]); // Ensure groups is always an array
    }
  };

  const filteredContacts = (contacts || []).filter(contact =>
    contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact?.phone?.includes(searchTerm)
  );

  const filteredGroups = (groups || []).filter(group =>
    group?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addRecipient = (recipient: SelectedRecipient) => {
    const exists = selectedRecipients.some(r => r.type === recipient.type && r.id === recipient.id);
    if (!exists) {
      setSelectedRecipients([...selectedRecipients, recipient]);
    }
  };

  const removeRecipient = (type: string, id: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => !(r.type === type && r.id === id)));
  };

  const getTotalRecipients = () => {
    return selectedRecipients.reduce((total, recipient) => {
      if (recipient.type === 'contact') {
        return total + 1;
      } else {
        return total + (recipient.count || 0);
      }
    }, 0);
  };

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      toast.error('Please enter a broadcast title');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!isDraft && scheduledAt && new Date(scheduledAt) <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setLoading(true);

    try {
      const recipients = selectedRecipients.map(recipient => ({
        type: recipient.type,
        id: recipient.id
      }));

      const broadcastData = {
        title: title.trim(),
        message: message.trim(),
        recipients,
        scheduled_at: scheduledAt || null,
        status: isDraft ? 'draft' : (scheduledAt ? 'scheduled' : 'pending')
      };

      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(broadcastData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isDraft ? 'Broadcast saved as draft' : 'Broadcast created successfully');
        
        // Reset form
        setTitle('');
        setMessage('');
        setScheduledAt('');
        setSelectedRecipients([]);
        
        // Redirect to broadcast details
        window.location.href = `/broadcast/${data.data.id}`;
      } else {
        toast.error(data.message || 'Failed to create broadcast');
      }
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast.error('Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message first');
      return;
    }

    setShowTestModal(true);
  };

  const handleSendTest = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      const response = await fetch('/api/broadcast/sender/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: testPhoneNumber.trim(),
          message: message.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Test message sent successfully');
        setShowTestModal(false);
        setTestPhoneNumber('');
      } else {
        toast.error(data.message || 'Failed to send test message');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compose Broadcast</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and send WhatsApp broadcast messages</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/broadcast'}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Message Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Broadcast Title *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter broadcast title..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {message.length} characters
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestMessage}
                    disabled={!message.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Test
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to send immediately after creation
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleSubmit(true)}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              {loading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : (
                scheduledAt ? <Clock className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />
              )}
              {scheduledAt ? 'Schedule Broadcast' : 'Create & Send'}
            </Button>
          </div>
        </div>

        {/* Recipients Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recipients</h2>
              <Button
                size="sm"
                onClick={() => setShowRecipientSelector(!showRecipientSelector)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Selected Recipients */}
            {selectedRecipients.length > 0 ? (
              <div className="space-y-2 mb-4">
                {selectedRecipients.map((recipient, index) => (
                  <div
                    key={`${recipient.type}-${recipient.id}`}
                    className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {recipient.type === 'contact' ? (
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{recipient.name}</p>
                        {recipient.phone && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{recipient.phone}</p>
                        )}
                        {recipient.count && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{recipient.count} contacts</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeRecipient(recipient.type, recipient.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
                  Total Recipients: {getTotalRecipients()}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm">No recipients selected</p>
              </div>
            )}

            {/* Recipient Selector */}
            {showRecipientSelector && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex gap-2 mb-3">
                  <Button
                    size="sm"
                    variant={activeTab === 'contacts' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('contacts')}
                  >
                    Contacts
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'groups' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('groups')}
                  >
                    Groups
                  </Button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {activeTab === 'contacts' ? (
                    filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => {
                        const isSelected = selectedRecipients.some(r => r.type === 'contact' && r.id === contact.id);
                        return (
                          <div
                            key={contact.id}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : ''
                            }`}
                            onClick={() => {
                              if (!isSelected) {
                                addRecipient({
                                  type: 'contact',
                                  id: contact.id,
                                  name: contact.name,
                                  phone: contact.phone
                                });
                              }
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{contact.phone}</p>
                              {contact.group_name && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">{contact.group_name}</p>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No contacts found</p>
                    )
                  ) : (
                    filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => {
                        const isSelected = selectedRecipients.some(r => r.type === 'group' && r.id === group.id);
                        return (
                          <div
                            key={group.id}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                              isSelected ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : ''
                            }`}
                            onClick={() => {
                              if (!isSelected) {
                                addRecipient({
                                  type: 'group',
                                  id: group.id,
                                  name: group.name,
                                  count: group.contact_count
                                });
                              }
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{group.contact_count} contacts</p>
                              {group.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-green-600 dark:text-green-400" />}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No groups found</p>
                    )
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Send Test Message
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a phone number to send a test message (include country code, e.g., +1234567890)
            </p>
            <Input
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTestModal(false);
                  setTestPhoneNumber('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendTest}
                disabled={!testPhoneNumber.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComposeBroadcast;