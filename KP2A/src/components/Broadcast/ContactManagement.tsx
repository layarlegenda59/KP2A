import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { 
  Users, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Filter,
  MoreVertical,
  UserPlus,
  FolderPlus,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  group_id: string | null;
  group_name?: string;
  created_at: string;
}

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
  created_at: string;
}

interface ContactFormData {
  name: string;
  phone: string;
  group_id: string;
}

interface GroupFormData {
  name: string;
  description: string;
}

const ContactManagement: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [importingMembers, setImportingMembers] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    phone: '',
    group_id: ''
  });
  const [groupForm, setGroupForm] = useState<GroupFormData>({
    name: '',
    description: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, selectedGroup]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/broadcast/contacts/all?limit=1000');
      const data = await response.json();
      
      if (data.success) {
        setContacts(data.data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/broadcast/groups');
      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data.groups)) {
        setGroups(data.data.groups);
      } else {
        // Ensure groups is always an array, even on API failure
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Ensure groups is always an array, even on network failure
      setGroups([]);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
      );
    }

    if (selectedGroup !== 'all') {
      if (selectedGroup === 'ungrouped') {
        filtered = filtered.filter(contact => !contact.group_id);
      } else {
        filtered = filtered.filter(contact => contact.group_id === selectedGroup);
      }
    }

    setFilteredContacts(filtered);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const url = editingContact 
        ? `/api/broadcast/contacts/${editingContact.id}`
        : '/api/broadcast/contacts';
      
      const method = editingContact ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactForm.name.trim(),
          phone: contactForm.phone.trim(),
          group_id: contactForm.group_id || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingContact ? 'Contact updated successfully' : 'Contact created successfully');
        setShowContactForm(false);
        setEditingContact(null);
        setContactForm({ name: '', phone: '', group_id: '' });
        fetchContacts();
      } else {
        toast.error(data.message || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupForm.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const url = editingGroup 
        ? `/api/broadcast/groups/${editingGroup.id}`
        : '/api/broadcast/groups';
      
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingGroup ? 'Group updated successfully' : 'Group created successfully');
        setShowGroupForm(false);
        setEditingGroup(null);
        setGroupForm({ name: '', description: '' });
        fetchGroups();
      } else {
        toast.error(data.message || 'Failed to save group');
      }
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Failed to save group');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const response = await fetch(`/api/broadcast/contacts/${contactId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Contact deleted successfully');
        fetchContacts();
      } else {
        toast.error(data.message || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Contacts in this group will become ungrouped.')) {
      return;
    }

    try {
      const response = await fetch(`/api/broadcast/groups/${groupId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Group deleted successfully');
        fetchGroups();
        fetchContacts(); // Refresh contacts to update group info
      } else {
        toast.error(data.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      group_id: contact.group_id || ''
    });
    setShowContactForm(true);
  };

  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || ''
    });
    setShowGroupForm(true);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/broadcast/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully imported ${data.data.imported} contacts`);
        fetchContacts();
      } else {
        toast.error(data.message || 'Failed to import contacts');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error('Failed to import contacts');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/broadcast/contacts/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Contacts exported successfully');
      } else {
        toast.error('Failed to export contacts');
      }
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error('Failed to export contacts');
    }
  };

  const handleImportMembers = async () => {
    if (!confirm('Are you sure you want to import all active members to contacts? This will add all members who are not already in the contacts list.')) {
      return;
    }

    setImportingMembers(true);
    
    try {
      const response = await fetch('/api/broadcast/contacts/import-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        
        // Show detailed results if available
        if (data.data) {
          const { imported, skipped, errors } = data.data;
          if (imported > 0) {
            toast.success(`✅ Successfully imported ${imported} members`);
          }
          if (skipped > 0) {
            toast.info(`ℹ️ Skipped ${skipped} members (duplicates or invalid data)`);
          }
          if (errors > 0) {
            toast.error(`❌ ${errors} members failed to import`);
          }
        }
        
        // Refresh contacts list
        fetchContacts();
      } else {
        toast.error(data.message || 'Failed to import members');
      }
    } catch (error) {
      console.error('Error importing members:', error);
      toast.error('Failed to import members');
    } finally {
      setImportingMembers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your broadcast contacts and groups</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/broadcast'}
          >
            Back to Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowGroupForm(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Group
          </Button>
          <Button 
            onClick={() => setShowContactForm(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contacts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{contacts.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Groups</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups?.length || 0}</p>
            </div>
            <FolderPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </Card>

        <Card className="p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
        </Card>

        <Card className="p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleImportMembers}
            disabled={importingMembers}
          >
            {importingMembers ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            {importingMembers ? 'Importing...' : 'Import Members'}
          </Button>
        </Card>

        <Card className="p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Groups</option>
              <option value="ungrouped">Ungrouped</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.contact_count})
                </option>
              )) || []}
            </select>
          </div>
        </div>
      </Card>

      {/* Groups Section */}
      {groups && groups.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{group.description}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">{group.contact_count} contacts</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Contacts Table */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Contacts ({filteredContacts.length})
          </h2>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No contacts found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {contacts.length === 0 ? 'Add your first contact to get started' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Group</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-600 dark:text-gray-400">{contact.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {contact.group_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {contact.group_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">No group</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditContact(contact)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <Input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Enter contact name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone *
                </label>
                <Input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group
                </label>
                <select
                  value={contactForm.group_id}
                  onChange={(e) => setContactForm({ ...contactForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No group</option>
                  {groups?.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  )) || []}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowContactForm(false);
                    setEditingContact(null);
                    setContactForm({ name: '', phone: '', group_id: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingContact ? 'Update' : 'Add'} Contact
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </h2>
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name *
                </label>
                <Input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Enter group description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowGroupForm(false);
                    setEditingGroup(null);
                    setGroupForm({ name: '', description: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingGroup ? 'Update' : 'Create'} Group
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContactManagement;