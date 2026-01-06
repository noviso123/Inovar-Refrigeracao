import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import api from '../services/api';

export interface Notification {
  id: string;
  userId?: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextData {
  notify: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  isPolling: boolean;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

// ============= POLLING CONFIGURATION =============
const POLLING_INTERVAL = 60000; // 60 seconds (increased from 30s)
const RECONNECT_DELAY = 5000; // 5 seconds after error
const MAX_CONSECUTIVE_ERRORS = 3;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  // Refs for managing intervals and visibility
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDocumentVisible = useRef(true);
  const lastFetchTime = useRef<number>(0);

  // Check if user is authenticated
  const isAuthenticated = useCallback((): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated()) {
      setNotifications([]);
      return;
    }

    if (!isDocumentVisible.current) {
      console.log('📋 Skipping notification fetch - tab not visible');
      return;
    }

    // Prevent too frequent fetches
    const now = Date.now();
    if (now - lastFetchTime.current < 10000) { // Min 10s between fetches
      return;
    }
    lastFetchTime.current = now;

    try {
      setIsPolling(true);
      const response = await api.get('/sistema/notificacoes');

      if (Array.isArray(response.data)) {
        const mapped = response.data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          createdAt: n.created_at,
          link: n.link
        }));

        setNotifications(mapped);
        setConsecutiveErrors(0); // Reset error count on success
      }
    } catch (error) {
      // Log but don't spam console
      if (consecutiveErrors === 0) {
        console.warn('⚠️ Error fetching notifications:', error);
      }

      setConsecutiveErrors(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`📋 Pausing notification polling after ${newCount} consecutive errors`);
        }
        return newCount;
      });
    } finally {
      setIsPolling(false);
    }
  }, [isAuthenticated, consecutiveErrors]);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isAuthenticated()) {
      return;
    }

    // If too many errors, wait longer before retrying
    const interval = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
      ? RECONNECT_DELAY * 2
      : POLLING_INTERVAL;

    console.log(`📋 Starting notification polling (interval: ${interval / 1000}s)`);

    fetchNotifications(); // Fetch immediately
    intervalRef.current = setInterval(fetchNotifications, interval);
  }, [isAuthenticated, consecutiveErrors, fetchNotifications]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log('📋 Stopping notification polling');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisible.current = !document.hidden;

      if (document.hidden) {
        console.log('📋 Tab hidden - pausing notifications');
        stopPolling();
      } else {
        console.log('📋 Tab visible - resuming notifications');
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling]);

  // Main polling effect
  useEffect(() => {
    if (isAuthenticated() && isDocumentVisible.current) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated, startPolling, stopPolling]);

  // Handle storage changes (login/logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          console.log('📋 Token added - starting polling');
          setConsecutiveErrors(0);
          startPolling();
        } else {
          console.log('📋 Token removed - stopping polling');
          setNotifications([]);
          stopPolling();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [startPolling, stopPolling]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    if (type === 'info') toast.info(message);
    else toast[type](message);
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // TODO: Call API to mark as read
    // try {
    //   await api.patch(`/sistema/notificacoes/${id}/read`);
    // } catch (error) {
    //   console.error('Error marking notification as read:', error);
    // }
  };

  return (
    <NotificationContext.Provider value={{ notify, notifications, unreadCount, markAsRead, isPolling }}>
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="light"
        style={{ fontFamily: 'Inter, sans-serif' }}
      />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};