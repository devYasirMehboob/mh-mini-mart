import apiClient from "./apiClient";

export async function getUnits(params = {}) {
  const response = await apiClient.get("/units", { params });
  return response.data.data;
}

export async function getUnit(id) {
  const response = await apiClient.get(`/units/${id}`);
  return response.data.data;
}

export async function createUnit(data) {
  const response = await apiClient.post("/units", data);
  return response.data.data;
}

export async function updateUnit(id, data) {
  const response = await apiClient.put(`/units/${id}`, data);
  return response.data.data;
}

export async function deleteUnit(id) {
  const response = await apiClient.delete(`/units/${id}`);
  return response.data.data;
}
