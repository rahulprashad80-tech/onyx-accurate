import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types';

export type NotificationType =
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'critical_ticket'
  | 'overdue_ticket'
  | 'warranty_expired'
  | 'warranty_expiring'
  | 'system';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  read: boolean;
  targetType?: 'ticket' | 'computer' | 'company' | 'department';
  targetId?: string;
  recipientRole?: UserRole | 'all';
  recipientEmail?: string;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  toasts: Toast[];
  addNotification: (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'it_desk_notifications_v1';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: InAppNotification[] = JSON.parse(stored);
        // Exclude any legacy demo/sample notifications
        return parsed.filter((n) => !n.id.startsWith('notif-init-'));
      }
    } catch (e) {
      console.warn('Failed to parse stored notifications', e);
    }
    // Clean empty notifications state for real operational data
    return [];
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications to storage', e);
    }
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const addNotification = (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: InAppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 99)]); // keep latest 100

    // Also dispatch a toast for high-priority items
    if (notif.severity === 'error' || notif.severity === 'warning') {
      showToast({
        title: notif.title,
        message: notif.message,
        type: notif.severity === 'error' ? 'error' : 'warning',
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 4500,
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
        showToast,
        removeToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
