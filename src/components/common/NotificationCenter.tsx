import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNotifications, InAppNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Ticket, Computer } from '../../types';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Ticket as TicketIcon,
  ShieldAlert,
  Monitor,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';

interface NotificationCenterProps {
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectComputer?: (computer: Computer) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onSelectTicket,
  onSelectComputer,
}) => {
  const { activeRole, userProfile } = useAuth();
  const { tickets, computers } = useData();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter based on role audience & category tab
  const roleFilteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.recipientRole && n.recipientRole !== 'all') {
        if (activeRole === 'employee' && n.recipientRole !== 'employee') return false;
        if (activeRole === 'technician' && n.recipientRole === 'admin') return false;
      }
      if (n.recipientEmail && userProfile?.email) {
        if (n.recipientEmail !== userProfile.email) return false;
      }

      if (filter === 'unread') return !n.read;
      if (filter === 'alerts') {
        return (
          n.severity === 'error' ||
          n.severity === 'warning' ||
          n.type === 'critical_ticket' ||
          n.type === 'overdue_ticket' ||
          n.type === 'warranty_expired' ||
          n.type === 'warranty_expiring'
        );
      }
      return true;
    });
  }, [notifications, activeRole, userProfile, filter]);

  const handleNotificationClick = (notif: InAppNotification) => {
    markAsRead(notif.id);

    if (notif.targetType === 'ticket' && notif.targetId && onSelectTicket) {
      const targetTicket = tickets.find(
        (t) => t.id === notif.targetId || t.ticketNumber === notif.targetId
      );
      if (targetTicket) {
        onSelectTicket(targetTicket);
        setIsOpen(false);
        return;
      }
    }

    if (notif.targetType === 'computer' && notif.targetId && onSelectComputer) {
      const targetComputer = computers.find(
        (c) => c.id === notif.targetId || c.assetTag === notif.targetId
      );
      if (targetComputer) {
        onSelectComputer(targetComputer);
        setIsOpen(false);
        return;
      }
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  const getIcon = (type: string, severity: string) => {
    if (severity === 'error' || type === 'critical_ticket') {
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    }
    if (severity === 'warning' || type === 'warranty_expiring' || type === 'overdue_ticket') {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    if (type.startsWith('ticket_')) {
      return <TicketIcon className="w-4 h-4 text-indigo-600" />;
    }
    if (type.startsWith('warranty_')) {
      return <Monitor className="w-4 h-4 text-cyan-600" />;
    }
    return <Clock className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  title="Clear all"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('alerts')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'alerts'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Alerts
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {roleFilteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No notifications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are all caught up on IT support and asset updates.
                </p>
              </div>
            ) : (
              roleFilteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 text-left transition-colors cursor-pointer flex items-start gap-3 group relative ${
                    notif.read ? 'bg-white hover:bg-slate-50/80' : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                    {getIcon(notif.type, notif.severity)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs truncate ${
                          notif.read ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                      {notif.targetId && (
                        <span className="text-[10px] font-medium text-indigo-600 inline-flex items-center gap-0.5">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                    title="Dismiss"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-1 rounded transition-opacity cursor-pointer absolute top-2 right-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
            <p className="text-[10px] text-slate-400">
              Real-time IT helpdesk & hardware lifecycle alerts
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
