import apiClient from "./apiClient";

export async function getCategories(search = "") {
  const response = await apiClient.get("/categories", {
    params: search ? { search } : {},
  });
  return response.data.data.categories;
}

export async function getCategory(id) {
  const response = await apiClient.get("/categories/" + id);
  return response.data.data.category;
}

export async function createCategory(data) {
  const response = await apiClient.post("/categories", data);
  return response.data;
}

export async function updateCategory(id, data) {
  const response = await apiClient.put("/categories/" + id, data);
  return response.data;
}

export async function updateCategoryStatus(id, status) {
  const response = await apiClient.patch("/categories/" + id + "/status", { status });
  return response.data;
}

export async function deleteCategory(id) {
  const response = await apiClient.delete("/categories/" + id);
  return response.data;
}
