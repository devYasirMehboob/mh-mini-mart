import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Check, Trash2, Settings, AlertCircle, Info, CheckCircle, 
  AlertTriangle, RefreshCw, PlusCircle, Search, CheckCheck, RotateCcw, 
  ChevronLeft, ChevronRight, CheckSquare
} from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import useAuth from '../hooks/useAuth';
import usePermissions from '../hooks/usePermissions';
import NotificationPreferencesDialog from './NotificationPreferencesDialog';
import AnnouncementModal from './AnnouncementModal';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { 
    unreadSummary, 
    notificationsList, 
    pagination,
    isLoading, 
    fetchNotifications,
    markAsRead, 
    markAsUnread,
    markAllAsRead, 
    dismiss,
    dismissAll,
    resolve,
    triggerEvaluation,
    createAnnouncement
  } = useNotifications(60);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'unread', 'read', 'resolved'
  const [severityFilter, setSeverityFilter] = useState(''); // '', 'critical', 'warning', 'info', 'success'
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    const params = {
      page: currentPage,
      limit: 15,
      search: search.trim() || undefined,
      severity: severityFilter || undefined,
    };

    if (statusTab !== 'all') {
      params.status = statusTab;
    }

    await fetchNotifications(params);
  }, [fetchNotifications, currentPage, search, statusTab, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusTabChange = (tab) => {
    setStatusTab(tab);
    setCurrentPage(1);
  };

  const handleSeverityCardClick = (sev) => {
    setSeverityFilter((prev) => (prev === sev ? '' : sev));
    setCurrentPage(1);
  };

  const handleRefreshScan = async () => {
    setIsEvaluating(true);
    await triggerEvaluation();
    await loadData();
    setIsEvaluating(false);
  };

  const handleResolve = async (id) => {
    await resolve(id);
    loadData();
  };

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    loadData();
  };

  const handleMarkAsUnread = async (id) => {
    await markAsUnread(id);
    loadData();
  };

  const handleDismiss = async (id) => {
    await dismiss(id);
    loadData();
  };

  const handleDismissAll = async () => {
    if (window.confirm('Are you sure you want to dismiss all notifications?')) {
      await dismissAll();
      loadData();
    }
  };

  const getIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
      default: return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBgColor = (severity, isUnread) => {
    if (!isUnread) return 'bg-white';
    switch (severity) {
      case 'critical': return 'bg-red-50/70 border-l-4 border-l-red-500';
      case 'warning': return 'bg-amber-50/70 border-l-4 border-l-amber-500';
      case 'success': return 'bg-green-50/70 border-l-4 border-l-green-500';
      default: return 'bg-blue-50/70 border-l-4 border-l-blue-500';
    }
  };

  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (isNaN(seconds) || seconds < 0) return 'Just now';
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            View, filter, and manage your system alerts and announcements.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshScan}
            disabled={isEvaluating}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Re-evaluate system alerts in real time"
          >
            <RefreshCw className={`h-4 w-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? 'Scanning...' : 'Scan Alerts'}
          </button>

          {can('notifications.announce') && (
            <button
              onClick={() => setIsAnnouncementOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-blue-600" />
              New Announcement
            </button>
          )}

          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </button>

          {unreadSummary.total > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Severity Stat Cards (Clickable for Filtering) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { key: 'critical', title: 'Critical', count: unreadSummary.critical, icon: AlertCircle, color: 'red', border: 'border-red-200', text: 'text-red-600', activeBg: 'bg-red-50 ring-2 ring-red-500' },
          { key: 'warning', title: 'Warning', count: unreadSummary.warning, icon: AlertTriangle, color: 'amber', border: 'border-amber-200', text: 'text-amber-500', activeBg: 'bg-amber-50 ring-2 ring-amber-500' },
          { key: 'info', title: 'Info', count: unreadSummary.info, icon: Info, color: 'blue', border: 'border-blue-200', text: 'text-blue-500', activeBg: 'bg-blue-50 ring-2 ring-blue-500' },
          { key: 'success', title: 'Success', count: unreadSummary.success, icon: CheckCircle, color: 'green', border: 'border-green-200', text: 'text-green-500', activeBg: 'bg-green-50 ring-2 ring-green-500' },
        ].map((card) => {
          const IconComp = card.icon;
          const isSelected = severityFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleSeverityCardClick(card.key)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 ${
                isSelected ? card.activeBg : card.border
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${card.text}`}>
                  <IconComp className="h-5 w-5" />
                  <h3 className="font-semibold text-sm">{card.title}</h3>
                </div>
                {isSelected && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-900 text-white">
                    Filtered
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{card.count}</p>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar & Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b sm:border-b-0 border-gray-200 pb-2 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'read', label: 'Read' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusTabChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Dismiss All */}
        <div className="flex items-center gap-3">
          {severityFilter && (
            <button
              onClick={() => setSeverityFilter('')}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Clear severity filter
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search notifications..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>

          {notificationsList.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Dismiss all shown notifications"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-sm font-medium">Loading notifications...</span>
          </div>
        ) : notificationsList.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No notifications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusTab !== 'all' || severityFilter
                ? 'Try adjusting your search query or severity filters.'
                : 'All caught up! You have no pending notifications right now.'}
            </p>
            <button
              onClick={handleRefreshScan}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Scan System Alerts
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notificationsList.map((notification) => {
              const isUnread = !notification.read_at && notification.status !== 'resolved';
              const isResolved = notification.status === 'resolved';

              return (
                <li
                  key={notification.id}
                  className={`p-4 sm:px-6 transition-colors ${getBgColor(notification.severity, isUnread)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getIcon(notification.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm text-gray-900 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                              {notification.title}
                            </p>
                            {notification.module && (
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                {notification.module}
                              </span>
                            )}
                            {isResolved && (
                              <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                Resolved
                              </span>
                            )}
                          </div>
                          
                          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                            {timeAgo(notification.created_at)}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Read / Unread toggle */}
                            {isUnread ? (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkAsUnread(notification.id)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                title="Mark as unread"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            {/* Resolve button for system alerts if not resolved */}
                            {!isResolved && can('notifications.resolve') && (
                              <button
                                onClick={() => handleResolve(notification.id)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 transition-colors"
                                title="Resolve alert"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </button>
                            )}

                            {/* Dismiss button */}
                            <button
                              onClick={() => handleDismiss(notification.id)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                              title="Dismiss notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action URL link */}
                      {notification.action_url && (
                        <div className="mt-3">
                          <Link
                            to={notification.action_url}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900 hover:underline"
                          >
                            View Details &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination Bar */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
            <div className="text-xs text-gray-500">
              Showing Page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.total_pages}</span> ({pagination.total} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={pagination.page >= pagination.total_pages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog 
        isOpen={isPreferencesOpen} 
        onClose={() => setIsPreferencesOpen(false)} 
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
        onSubmit={createAnnouncement}
      />
    </div>
  );
}
