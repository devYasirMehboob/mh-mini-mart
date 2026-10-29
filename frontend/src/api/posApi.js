import apiClient from "./apiClient";

export async function getPosProducts(params = {}, signal, config = {}) {
  // If running in Desktop App and server is unreachable, seamless fallback to local SQLite
  if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
    try {
      const response = await apiClient.get("/pos/products", { params, signal, ...config });
      return response.data.data;
    } catch (err) {
      if (!err.response && window.electronAPI?.searchProducts) {
        return window.electronAPI.searchProducts(params);
      }
      throw err;
    }
  }

  const response = await apiClient.get("/pos/products", { params, signal, ...config });
  return response.data.data;
}

export async function getPosCategories(config = {}) {
  const response = await apiClient.get("/pos/categories", config);
  return response.data.data.categories;
}
