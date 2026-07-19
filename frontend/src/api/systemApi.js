import apiClient from "./apiClient";

export async function resetDatabase(password) {
  const response = await apiClient.post("/system/reset-database", { password });
  return response.data;
}
