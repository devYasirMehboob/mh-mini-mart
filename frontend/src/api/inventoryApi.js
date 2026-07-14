import apiClient from "./apiClient";

export async function getInventory(filters = {}) {
  const response = await apiClient.get("/inventory", { params: filters });
  return response.data.data;
}

export async function getInventorySummary() {
  const response = await apiClient.get("/inventory/summary");
  return response.data.data.summary;
}

export async function getStockTransactions(filters = {}) {
  const response = await apiClient.get("/inventory/transactions", { params: filters });
  return response.data.data;
}

export async function getProductStockTransactions(productId, filters = {}) {
  const response = await apiClient.get("/inventory/products/" + productId + "/transactions", { params: filters });
  return response.data.data;
}

export async function recordStockMovement(endpoint, data) {
  const response = await apiClient.post("/inventory/" + endpoint, data);
  return response.data;
}
