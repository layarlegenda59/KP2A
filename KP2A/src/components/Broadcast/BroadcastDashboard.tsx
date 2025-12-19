import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaWhatsapp,
  FaBullhorn,
  FaUsers,
  FaHistory,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaPaperPlane,
  FaPlug,
  FaExclamationTriangle,
  FaAddressBook,
  FaChartLine,
  FaArrowRight
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import whatsappSocketService from '../../services/whatsapp-socket.service';

interface BroadcastStats {
  totalBroadcasts: number;
  pendingBroadcasts: number;
  sentBroadcasts: number;
  failedBroadcasts: number;
  totalContacts: number;
  totalGroups: number;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'completed';
  scheduled_at: string | null;
  created_at: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
}

const BroadcastDashboard: React.FC = () => {
  const [stats, setStats] = useState<BroadcastStats>({
    totalBroadcasts: 0,
    pendingBroadcasts: 0,
    sentBroadcasts: 0,
    failedBroadcasts: 0,
    totalContacts: 0,
    totalGroups: 0
  });
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    checkWhatsAppStatus();

    // Subscribe to WhatsApp status changes
    whatsappSocketService.onStatusChange((status: any) => {
      setWhatsappConnected(status.isConnected || status.connected || status.status === 'connected');
    });

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      checkWhatsAppStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data from API
      const dashboardResponse = await fetch('/api/broadcast/dashboard');
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();

        if (dashboardData.success) {
          const data = dashboardData.data;

          setStats({
            totalBroadcasts: data.statistics?.totalBroadcasts || 0,
            pendingBroadcasts: data.statistics?.pendingBroadcasts || 0,
            sentBroadcasts: data.statistics?.completedBroadcasts || 0,
            failedBroadcasts: data.statistics?.failedBroadcasts || 0,
            totalContacts: data.statistics?.totalRecipients || 0,
            totalGroups: 0
          });

          // Set recent broadcasts
          if (data.recentActivity) {
            const broadcasts = data.recentActivity.map((activity: any) => ({
              id: activity.id,
              title: activity.message?.substring(0, 50) + '...',
              message: activity.message,
              status: activity.status,
              scheduled_at: activity.scheduledFor,
              created_at: activity.createdAt,
              total_recipients: activity.recipientCount || 0,
              sent_count: activity.status === 'completed' ? activity.recipientCount : 0,
              failed_count: activity.status === 'failed' ? activity.recipientCount : 0
            }));
            setRecentBroadcasts(broadcasts);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const status = await whatsappSocketService.getStatus();
      setWhatsappConnected(status.isConnected || false);
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappConnected(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'sending':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'scheduled':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
        return <FaCheckCircle className="h-4 w-4" />;
      case 'sending':
        return <FaPaperPlane className="h-4 w-4" />;
      case 'failed':
        return <FaTimesCircle className="h-4 w-4" />;
      case 'scheduled':
        return <FaClock className="h-4 w-4" />;
      default:
        return <FaBullhorn className="h-4 w-4" />;
    }
  };

  const quickActions = [
    {
      title: 'Koneksi WhatsApp',
      description: whatsappConnected ? 'Terhubung' : 'Belum terhubung',
      icon: FaPlug,
      href: '/whatsapp-mobile',
      color: whatsappConnected ? 'green' : 'red',
      status: whatsappConnected
    },
    {
      title: 'Buat Broadcast',
      description: 'Kirim pesan ke banyak kontak',
      icon: FaPlus,
      href: '/broadcast/compose',
      color: 'blue'
    },
    {
      title: 'Kelola Kontak',
      description: `${stats.totalContacts} kontak tersimpan`,
      icon: FaAddressBook,
      href: '/broadcast/contacts',
      color: 'purple'
    },
    {
      title: 'Riwayat Broadcast',
      description: `${stats.totalBroadcasts} broadcast total`,
      icon: FaHistory,
      href: '/broadcast/history',
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
      green: {
        bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10',
        border: 'border-green-200 dark:border-green-800',
        icon: 'bg-green-500 text-white',
        text: 'text-green-700 dark:text-green-300'
      },
      red: {
        bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10',
        border: 'border-red-200 dark:border-red-800',
        icon: 'bg-red-500 text-white',
        text: 'text-red-700 dark:text-red-300'
      },
      blue: {
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'bg-blue-500 text-white',
        text: 'text-blue-700 dark:text-blue-300'
      },
      purple: {
        bg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10',
        border: 'border-purple-200 dark:border-purple-800',
        icon: 'bg-purple-500 text-white',
        text: 'text-purple-700 dark:text-purple-300'
      },
      orange: {
        bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'bg-orange-500 text-white',
        text: 'text-orange-700 dark:text-orange-300'
      }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 border ${whatsappConnected
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
            : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${whatsappConnected ? 'bg-green-500' : 'bg-red-500'}`}>
              <FaWhatsapp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${whatsappConnected ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {whatsappConnected ? 'WhatsApp Terhubung' : 'WhatsApp Tidak Terhubung'}
              </h3>
              <p className={`text-sm ${whatsappConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {whatsappConnected
                  ? 'Siap untuk mengirim broadcast'
                  : 'Hubungkan WhatsApp untuk mengirim pesan'}
              </p>
            </div>
          </div>
          <Link
            to="/whatsapp-mobile"
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${whatsappConnected
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
          >
            {whatsappConnected ? 'Kelola Koneksi' : 'Hubungkan Sekarang'}
            <FaArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const colorClass = getColorClasses(action.color);
          return (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={action.href}
                className={`block p-5 rounded-xl border ${colorClass.bg} ${colorClass.border} hover:shadow-lg transition-all group`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${colorClass.icon}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  {action.status !== undefined && (
                    <div className={`w-3 h-3 rounded-full ${action.status ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  )}
                </div>
                <h3 className={`font-semibold mt-3 ${colorClass.text}`}>{action.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={colorClass.text}>Buka</span>
                  <FaArrowRight className={`h-3 w-3 ${colorClass.text}`} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Broadcast</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalBroadcasts}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaBullhorn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Berhasil Terkirim</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.sentBroadcasts}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pendingBroadcasts}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FaClock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Kontak</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.totalContacts}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FaUsers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Broadcasts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Broadcast Terbaru</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Aktivitas broadcast terakhir</p>
          </div>
          <Link
            to="/broadcast/history"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            Lihat Semua
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentBroadcasts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FaBullhorn className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Belum ada broadcast</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Buat broadcast pertama Anda untuk mulai mengirim pesan</p>
              <Link
                to="/broadcast/compose"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaPlus className="h-4 w-4" />
                Buat Broadcast
              </Link>
            </div>
          ) : (
            recentBroadcasts.slice(0, 5).map((broadcast) => (
              <div key={broadcast.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">{broadcast.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(broadcast.status)}`}>
                        {getStatusIcon(broadcast.status)}
                        {broadcast.status === 'completed' ? 'Terkirim' :
                          broadcast.status === 'sent' ? 'Terkirim' :
                            broadcast.status === 'sending' ? 'Mengirim' :
                              broadcast.status === 'failed' ? 'Gagal' :
                                broadcast.status === 'scheduled' ? 'Terjadwal' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{broadcast.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>{broadcast.total_recipients} penerima</span>
                      {broadcast.sent_count > 0 && <span className="text-green-600">{broadcast.sent_count} terkirim</span>}
                      {broadcast.failed_count > 0 && <span className="text-red-600">{broadcast.failed_count} gagal</span>}
                      <span>{new Date(broadcast.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Warning if not connected */}
      {!whatsappConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">WhatsApp Belum Terhubung</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Untuk dapat mengirim broadcast, Anda perlu menghubungkan WhatsApp terlebih dahulu.
                Klik tombol "Hubungkan Sekarang" di atas atau buka menu Koneksi.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BroadcastDashboard;