import apiClient from "./apiClient";

export async function getProducts(filters = {}) {
  const response = await apiClient.get("/products", { params: filters });
  return response.data.data;
}

export async function getProduct(id) {
  const response = await apiClient.get("/products/" + id);
  return response.data.data.product;
}

export async function createProduct(data) {
  const response = await apiClient.post("/products", data);
  return response.data;
}

export async function updateProduct(id, data) {
  const response = await apiClient.put("/products/" + id, data);
  return response.data;
}

export async function updateProductStatus(id, status) {
  const response = await apiClient.patch(`/products/${id}/status`, { status });
  return response.data;
}

export async function generateProductBarcode(id) {
  const response = await apiClient.post(`/products/${id}/barcode/generate`);
  return response.data;
}

export async function deleteProduct(id) {
  const response = await apiClient.delete("/products/" + id);
  return response.data;
}

export function productImageUrl(path) {
  if (!path) return null;

  let baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  
  // Locally, the API is in /backend/api, but uploads are in /backend/uploads
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      baseUrl = baseUrl.replace(/\/api$/, "");
      return baseUrl + "/" + path.replace(/^\/+/, "");
  }

  // On the live server, the entire backend is deployed into the /api folder
  // So both the API entry point and the uploads folder exist under /api
  // Therefore, we don't strip /api from the baseUrl on the live server.
  return baseUrl + "/" + path.replace(/^\/+/, "");
}
