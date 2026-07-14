import apiClient from "./apiClient";

export async function getDashboard() {
  const response = await apiClient.get("/dashboard");
  return response.data.data;
}
