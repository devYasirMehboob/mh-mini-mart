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

  const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "");
  
  // If the baseUrl is exactly the domain root, it means the API is mapped directly 
  // (like https://store.mhminimart.com/api). On a live server structured like this, 
  // the uploads folder is typically located in /backend/uploads
  if (baseUrl === "https://store.mhminimart.com" || baseUrl === "http://store.mhminimart.com") {
      return baseUrl + "/backend/" + path.replace(/^\/+/, "");
  }

  return baseUrl + "/" + path.replace(/^\/+/, "");
}
