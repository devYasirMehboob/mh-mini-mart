import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api/notifications";
import { logger } from "../utils/logger";

export default function useNotifications(pollingInterval = 60) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSummary, setUnreadSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0, success: 0 });
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.getUnreadCount();
      if (response.success && response.data?.summary) {
        setUnreadSummary(response.data.summary);
        setUnreadCount(response.data.summary.total);
      }
    } catch (err) {
      logger.error("Failed to fetch notification summary", err);
    }
  }, []);

  const fetchRecent = useCallback(async (limit = 5) => {
    try {
      setIsLoading(true);
      const response = await api.getRecentNotifications(limit);
      if (response.success && response.data?.notifications) {
        setRecentNotifications(response.data.notifications);
      }
    } catch (err) {
      setError(err);
      logger.error("Failed to fetch recent notifications", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async (params = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getNotifications(params);
      if (response.success && response.data) {
        setNotificationsList(response.data.notifications || []);
        if (response.data.summary) {
          setUnreadSummary(response.data.summary);
          setUnreadCount(response.data.summary.total);
        }
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
      return response;
    } catch (err) {
      setError(err);
      logger.error("Failed to fetch notifications list", err);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchSummary();
    fetchRecent(5);
    
    if (pollingInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        fetchSummary();
        fetchRecent(5);
      }, pollingInterval * 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchSummary, fetchRecent, pollingInterval]);

  const markAsRead = async (id) => {
    try {
      await api.markAsRead(id);
      const now = new Date().toISOString();
      setRecentNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: now } : n)
      );
      setNotificationsList(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: now } : n)
      );
      fetchSummary();
    } catch (err) {
      logger.error("Failed to mark notification as read", err);
    }
  };

  const markAsUnread = async (id) => {
    try {
      await api.markAsUnread(id);
      setRecentNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: null } : n)
      );
      setNotificationsList(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: null } : n)
      );
      fetchSummary();
    } catch (err) {
      logger.error("Failed to mark notification as unread", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      const now = new Date().toISOString();
      setRecentNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || now }))
      );
      setNotificationsList(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || now }))
      );
      fetchSummary();
    } catch (err) {
      logger.error("Failed to mark all notifications as read", err);
    }
  };

  const dismiss = async (id) => {
    try {
      await api.dismissNotification(id);
      setRecentNotifications(prev => prev.filter(n => n.id !== id));
      setNotificationsList(prev => prev.filter(n => n.id !== id));
      fetchSummary();
    } catch (err) {
      logger.error("Failed to dismiss notification", err);
    }
  };

  const dismissAll = async () => {
    try {
      await api.dismissAll();
      setRecentNotifications([]);
      setNotificationsList([]);
      fetchSummary();
    } catch (err) {
      logger.error("Failed to dismiss all notifications", err);
    }
  };

  const resolve = async (id) => {
    try {
      const response = await api.resolveNotification(id);
      if (response.success) {
        setNotificationsList(prev =>
          prev.map(n => n.id === id ? { ...n, status: 'resolved' } : n)
        );
        fetchSummary();
      }
      return response;
    } catch (err) {
      logger.error("Failed to resolve notification", err);
      return { success: false, message: err.message };
    }
  };

  const triggerEvaluation = async () => {
    try {
      setIsLoading(true);
      const response = await api.triggerAlertEvaluation();
      await fetchSummary();
      return response;
    } catch (err) {
      logger.error("Failed to trigger alert evaluation", err);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createAnnouncement = async (data) => {
    try {
      const response = await api.createAnnouncement(data);
      if (response.success) {
        fetchSummary();
      }
      return response;
    } catch (err) {
      logger.error("Failed to create announcement", err);
      return { success: false, message: err.message };
    }
  };

  return {
    unreadCount,
    unreadSummary,
    recentNotifications,
    notificationsList,
    pagination,
    isLoading,
    error,
    fetchSummary,
    fetchRecent,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    dismiss,
    dismissAll,
    resolve,
    triggerEvaluation,
    createAnnouncement
  };
}
