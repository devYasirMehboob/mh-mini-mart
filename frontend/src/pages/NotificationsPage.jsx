import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import NotificationPreferencesDialog from './NotificationPreferencesDialog';

export default function NotificationsPage() {
  const { 
    unreadSummary, 
    recentNotifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    dismiss,
    fetchSummary,
    fetchRecent
  } = useNotifications(60);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    fetchRecent(50); // Fetch more for the full page
  }, [fetchRecent]);

  const getIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (severity, isUnread) => {
    if (!isUnread) return 'bg-white';
    switch (severity) {
      case 'critical': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      case 'success': return 'bg-green-50';
      default: return 'bg-blue-50';
    }
  };

  const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your alerts and messages.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </button>
          {unreadSummary.total > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold text-sm">Critical</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unreadSummary.critical}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold text-sm">Warning</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unreadSummary.warning}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500">
            <Info className="h-5 w-5" />
            <h3 className="font-semibold text-sm">Info</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unreadSummary.info}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-semibold text-sm">Success</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unreadSummary.success}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading && recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading notifications...</div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500">You don't have any notifications right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recentNotifications.map((notification) => {
              const isUnread = !notification.read_at && notification.status !== 'resolved';
              
              return (
                <li key={notification.id} className={`p-4 sm:px-6 transition-colors ${getBgColor(notification.severity, isUnread)}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className={`text-sm font-medium text-gray-900 ${isUnread ? 'font-bold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-xs text-gray-500">
                            {timeAgo(notification.created_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => dismiss(notification.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Dismiss"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {notification.action_url && (
                        <div className="mt-2">
                          <a 
                            href={notification.action_url}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NotificationPreferencesDialog 
        isOpen={isPreferencesOpen} 
        onClose={() => setIsPreferencesOpen(false)} 
      />
    </div>
  );
}
