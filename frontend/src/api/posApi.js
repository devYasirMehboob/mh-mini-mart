import apiClient from "./apiClient";

export async function getPosProducts(params = {}, signal, config = {}) {
  const response = await apiClient.get("/pos/products", { params, signal, ...config });
  return response.data.data;
}

export async function getPosCategories(config = {}) {
  const response = await apiClient.get("/pos/categories", config);
  return response.data.data.categories;
}
