import apiClient from "./apiClient";

export async function getCsrfToken() {
  const response = await apiClient.get("/csrf-token");
  return response.data.data.csrfToken;
}

export async function loginUser(password) {
  const response = await apiClient.post("/auth/login", { password });
  return response.data.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get("/auth/me");
  return response.data.data.user;
}

export async function logoutUser() {
  await apiClient.post("/auth/logout");
}
