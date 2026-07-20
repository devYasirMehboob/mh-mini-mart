import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api/notifications";
import { logger } from "../utils/logger";

export default function useNotifications(pollingInterval = 60) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSummary, setUnreadSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0, success: 0 });
  const [recentNotifications, setRecentNotifications] = useState([]);
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

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchSummary();
    
    if (pollingInterval > 0) {
      pollIntervalRef.current = setInterval(fetchSummary, pollingInterval * 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchSummary, pollingInterval]);

  const markAsRead = async (id) => {
    try {
      await api.markAsRead(id);
      setRecentNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      fetchSummary();
    } catch (err) {
      logger.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      setRecentNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      fetchSummary();
    } catch (err) {
      logger.error(err);
    }
  };

  const dismiss = async (id) => {
    try {
      await api.dismissNotification(id);
      setRecentNotifications(prev => prev.filter(n => n.id !== id));
      fetchSummary();
    } catch (err) {
      logger.error(err);
    }
  };

  return {
    unreadCount,
    unreadSummary,
    recentNotifications,
    isLoading,
    error,
    fetchSummary,
    fetchRecent,
    markAsRead,
    markAllAsRead,
    dismiss
  };
}
