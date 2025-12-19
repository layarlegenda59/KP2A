import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  created_at: string;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
}

interface BroadcastAnalytics {
  id: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  success_rate: number;
  avg_delivery_time: number | null;
  failed_reasons: { [key: string]: number };
}

interface BroadcastRecipient {
  id: string;
  contact_name: string;
  contact_phone: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
}

const BroadcastHistory: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [analytics, setAnalytics] = useState<BroadcastAnalytics | null>(null);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/broadcast?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setBroadcasts(data.data.broadcasts);
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast.error('Failed to load broadcast history');
    } finally {
      setLoading(false);
    }
  };

  const fetchBroadcastDetails = async (broadcastId: string) => {
    try {
      setLoadingAnalytics(true);
      
      // Fetch analytics
      const analyticsResponse = await fetch(`/api/broadcast/${broadcastId}/analytics`);
      const analyticsData = await analyticsResponse.json();
      
      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
      }

      // Fetch recipients
      const recipientsResponse = await fetch(`/api/broadcast/${broadcastId}/recipients`);
      const recipientsData = await recipientsResponse.json();
      
      if (recipientsData.success) {
        setRecipients(recipientsData.data.recipients);
      }

    } catch (error) {
      console.error('Error fetching broadcast details:', error);
      toast.error('Failed to load broadcast details');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleViewDetails = (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowDetails(true);
    fetchBroadcastDetails(broadcast.id);
  };

  const handleSendImmediateBroadcast = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to send this broadcast immediately?')) {
      return;
    }

    try {
      const response = await fetch(`/api/broadcast/${broadcastId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Broadcast sent successfully');
        fetchBroadcasts();
      } else {
        toast.error(data.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'sending': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'scheduled': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4" />;
      case 'sending': return <Send className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const filteredBroadcasts = broadcasts.filter(broadcast => {
    const matchesStatus = statusFilter === 'all' || broadcast.status === statusFilter;
    const matchesSearch = broadcast.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         broadcast.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getSuccessRate = (broadcast: Broadcast) => {
    if (broadcast.total_recipients === 0) return 0;
    return Math.round((broadcast.sent_count / broadcast.total_recipients) * 100);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Broadcast History & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and analyze your broadcast performance</p>
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
            onClick={fetchBroadcasts}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search broadcasts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Broadcasts List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Broadcasts ({filteredBroadcasts.length})
        </h2>

        {filteredBroadcasts.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No broadcasts found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {broadcasts.length === 0 ? 'Create your first broadcast to get started' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBroadcasts.map((broadcast) => (
              <div 
                key={broadcast.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{broadcast.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(broadcast.status)}`}>
                        {getStatusIcon(broadcast.status)}
                        {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{broadcast.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Recipients:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">{broadcast.total_recipients}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Sent:</span>
                        <span className="ml-1 font-medium text-green-600 dark:text-green-400">{broadcast.sent_count}</span>
                      </div>
                      {broadcast.failed_count > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Failed:</span>
                          <span className="ml-1 font-medium text-red-600 dark:text-red-400">{broadcast.failed_count}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">{getSuccessRate(broadcast)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>Created: {new Date(broadcast.created_at).toLocaleString()}</span>
                      {broadcast.scheduled_at && (
                        <span>Scheduled: {new Date(broadcast.scheduled_at).toLocaleString()}</span>
                      )}
                      {broadcast.sent_at && (
                        <span>Sent: {new Date(broadcast.sent_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(broadcast)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                    {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                      <Button 
                        size="sm"
                        onClick={() => handleSendImmediateBroadcast(broadcast.id)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Broadcast Details Modal */}
      {showDetails && selectedBroadcast && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{selectedBroadcast.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBroadcast.status)}`}>
                      {getStatusIcon(selectedBroadcast.status)}
                      {selectedBroadcast.status.charAt(0).toUpperCase() + selectedBroadcast.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {new Date(selectedBroadcast.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedBroadcast(null);
                    setAnalytics(null);
                    setRecipients([]);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Message Content */}
                    <Card className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Message Content</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedBroadcast.message}</p>
                    </Card>

                    {/* Analytics */}
                    {analytics && (
                      <Card className="p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Analytics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.total_recipients}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.sent_count}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Sent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.failed_count}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.success_rate}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                          </div>
                        </div>

                        {Object.keys(analytics.failed_reasons).length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Failure Reasons</h4>
                            <div className="space-y-2">
                              {Object.entries(analytics.failed_reasons).map(([reason, count]) => (
                                <div key={reason} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
                                  <span className="text-sm font-medium text-red-600 dark:text-red-400">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    )}

                    {/* Recipients */}
                    {recipients.length > 0 && (
                      <Card className="p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Recipients ({recipients.length})</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Contact</th>
                                <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Phone</th>
                                <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Status</th>
                                <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Sent At</th>
                                <th className="text-left py-2 font-medium text-gray-900 dark:text-white">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recipients.map((recipient) => (
                                <tr key={recipient.id} className="border-b border-gray-100 dark:border-gray-700">
                                   <td className="py-2 text-gray-900 dark:text-white">{recipient.contact_name}</td>
                                   <td className="py-2 text-gray-600 dark:text-gray-400">{recipient.contact_phone}</td>
                                   <td className="py-2">
                                     <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recipient.status)}`}>
                                       {getStatusIcon(recipient.status)}
                                       {recipient.status.charAt(0).toUpperCase() + recipient.status.slice(1)}
                                     </span>
                                   </td>
                                   <td className="py-2 text-gray-600 dark:text-gray-400">
                                     {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}
                                   </td>
                                  <td className="py-2">
                                    {recipient.error_message ? (
                                      <span className="text-red-600 dark:text-red-400 text-xs" title={recipient.error_message}>
                                        {recipient.error_message.length > 30 
                                          ? `${recipient.error_message.substring(0, 30)}...` 
                                          : recipient.error_message}
                                      </span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default BroadcastHistory;