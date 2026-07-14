import apiClient from "./apiClient";

export async function completeSale(payload) { const response = await apiClient.post("/sales", payload); return response.data; }
export async function getSales(params = {}) { const response = await apiClient.get("/sales", { params }); return response.data.data; }
export async function getSalesSummary(params = {}) { const response = await apiClient.get("/sales/summary", { params }); return response.data.data; }
export async function getSale(id) { const response = await apiClient.get(`/sales/${id}`); return response.data.data; }
export async function getSaleReceipt(id) { const response = await apiClient.get(`/sales/${id}/receipt`); return response.data.data; }
export async function cancelSale(id, reason) { const response = await apiClient.post(`/sales/${id}/cancel`, { reason }); return response.data; }
export async function refundSale(id, payload) { const response = await apiClient.post(`/sales/${id}/refund`, payload); return response.data; }
export async function exportSales(params = {}) { return apiClient.get("/sales/export", { params, responseType: "blob" }); }
