import apiClient from "./apiClient";

export async function getNotifications(params = {}) {
  const response = await apiClient.get("/notifications", { params });
  return response.data;
}

export async function getRecentNotifications(limit = 5) {
  const response = await apiClient.get("/notifications/recent", { params: { limit }, silent: true });
  return response.data;
}

export async function getUnreadCount() {
  const response = await apiClient.get("/notifications/unread-count", { silent: true });
  return response.data;
}

export async function markAsRead(id) {
  const response = await apiClient.post(`/notifications/${id}/read`);
  return response.data;
}

export async function markAsUnread(id) {
  const response = await apiClient.post(`/notifications/${id}/unread`);
  return response.data;
}

export async function dismissNotification(id) {
  const response = await apiClient.post(`/notifications/${id}/dismiss`);
  return response.data;
}

export async function resolveNotification(id) {
  const response = await apiClient.post(`/notifications/${id}/resolve`);
  return response.data;
}

export async function markAllAsRead() {
  const response = await apiClient.post("/notifications/mark-all-read");
  return response.data;
}

export async function dismissAll() {
  const response = await apiClient.post("/notifications/dismiss-all");
  return response.data;
}

export async function createAnnouncement(data) {
  const response = await apiClient.post("/notifications/announce", data);
  return response.data;
}

export async function triggerAlertEvaluation() {
  const response = await apiClient.post("/notifications/evaluate");
  return response.data;
}

export async function getNotificationPreferences() {
  const response = await apiClient.get("/notifications/preferences");
  return response.data;
}

export async function updateNotificationPreferences(data) {
  const response = await apiClient.put("/notifications/preferences", data);
  return response.data;
}
