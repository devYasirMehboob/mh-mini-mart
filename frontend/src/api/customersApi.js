import apiClient from "./apiClient";

// ---- Customer CRUD ----

export async function getCustomers(params = {}) {
  const response = await apiClient.get("/customers", { params });
  return response.data;
}

export async function getCustomersMetrics() {
  const response = await apiClient.get("/customers/metrics");
  return response.data;
}

export async function searchCustomers(query, limit = 10) {
  const response = await apiClient.get("/customers/search", { params: { q: query, limit } });
  return response.data;
}

export async function getCustomer(id) {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
}

export async function getCustomerSummary(id) {
  const response = await apiClient.get(`/customers/${id}/summary`);
  return response.data;
}

export async function getCustomerCreditSummary(id) {
  const response = await apiClient.get(`/customers/${id}/credit-summary`);
  return response.data;
}

export async function getCustomerBalance(id) {
  const response = await apiClient.get(`/customers/${id}/balance`);
  return response.data;
}

export async function createCustomer(data) {
  const response = await apiClient.post("/customers", data);
  return response.data;
}

export async function quickAddCustomer(data) {
  const response = await apiClient.post("/customers/quick-add", data);
  return response.data;
}

export async function updateCustomer(id, data) {
  const response = await apiClient.put(`/customers/${id}`, data);
  return response.data;
}

export async function patchCustomerStatus(id, status) {
  const response = await apiClient.patch(`/customers/${id}/status`, { status });
  return response.data;
}

// ---- Ledger / Statement ----

export async function getCustomerLedger(id, params = {}) {
  const response = await apiClient.get(`/customers/${id}/ledger`, { params });
  return response.data;
}

export async function getCustomerStatement(id, params = {}) {
  const response = await apiClient.get(`/customers/${id}/statement`, { params });
  return response.data;
}

export async function reconcileCustomer(id) {
  const response = await apiClient.get(`/customers/${id}/reconcile`);
  return response.data;
}

// ---- Purchase history ----

export async function getCustomerPurchases(id, params = {}) {
  const response = await apiClient.get(`/customers/${id}/purchases`, { params });
  return response.data;
}

// ---- Payments ----

export async function receiveKhataPayment(customerId, data) {
  const response = await apiClient.post(`/customers/${customerId}/payments`, data);
  return response.data;
}

export async function getCustomerPayments(customerId, params = {}) {
  const response = await apiClient.get(`/customers/${customerId}/payments`, { params });
  return response.data;
}
