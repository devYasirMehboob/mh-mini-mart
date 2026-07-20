import { useState, useCallback } from "react";
import * as api from "../api/notifications";
import { logger } from "../utils/logger";

export default function useNotificationPreferences() {
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getNotificationPreferences();
      if (response.success && response.data?.preferences) {
        setPreferences(response.data.preferences);
      }
    } catch (err) {
      logger.error("Failed to fetch preferences", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = async (newPrefs) => {
    try {
      const response = await api.updateNotificationPreferences(newPrefs);
      if (response.success && response.data?.preferences) {
        setPreferences(response.data.preferences);
      }
      return { success: true, message: response.message || "Preferences updated." };
    } catch (err) {
      console.error("Failed to update preferences", err);
      return { success: false, message: err.response?.data?.message || "Failed to update preferences." };
    }
  };

  return {
    preferences,
    isLoading,
    fetchPreferences,
    updatePreferences
  };
}
