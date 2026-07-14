import apiClient from "./apiClient";

export async function getUsers(params = {}) { const response = await apiClient.get("/users", { params }); return response.data.data; }
export async function getUser(id) { const response = await apiClient.get(`/users/${id}`); return response.data.data; }
export async function createUser(data) { const response = await apiClient.post("/users", data); return response.data; }
export async function updateUser(id, data) { const response = await apiClient.put(`/users/${id}`, data); return response.data; }
export async function updateUserStatus(id, status) { const response = await apiClient.patch(`/users/${id}/status`, { status }); return response.data; }
export async function resetUserPassword(id, data) { const response = await apiClient.post(`/users/${id}/reset-password`, data); return response.data; }
export async function deleteUser(id) { const response = await apiClient.delete(`/users/${id}`); return response.data; }
export async function getRoles() { const response = await apiClient.get("/roles"); return response.data.data.roles; }
export async function getPermissions() { const response = await apiClient.get("/permissions"); return response.data.data.permissions; }
export async function getRolePermissions(id) { const response = await apiClient.get(`/roles/${id}/permissions`); return response.data.data; }
export async function updateRolePermissions(id, permissionKeys) { const response = await apiClient.put(`/roles/${id}/permissions`, { permission_keys: permissionKeys }); return response.data; }
export async function updateUserPermissions(id, overrides) { const response = await apiClient.put(`/users/${id}/permissions`, { overrides }); return response.data; }