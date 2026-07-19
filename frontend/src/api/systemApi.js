import apiClient from "./apiClient";

export async function resetDatabase(password) {
  const response = await apiClient.post("/system/reset-database", { password }, {
    timeout: 60000 // Increase timeout to 60 seconds for this heavy operation
  });
  return response.data;
}
