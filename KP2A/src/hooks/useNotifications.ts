import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, {
          description: notification.message,
        });
        break;
      case 'error':
        toast.error(notification.title, {
          description: notification.message,
        });
        break;
      case 'warning':
        toast.warning(notification.title, {
          description: notification.message,
        });
        break;
      case 'info':
        toast.info(notification.title, {
          description: notification.message,
        });
        break;
    }

    return newNotification.id;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Auto-remove old notifications (older than 24 hours)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(notification => {
          const hoursDiff = (now.getTime() - notification.timestamp.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 24;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  };
};