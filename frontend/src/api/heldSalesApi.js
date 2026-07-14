import apiClient from "./apiClient";
export async function getHeldSales(){const response=await apiClient.get("/held-sales");return response.data.data.held_sales;}
export async function getHeldSale(id){const response=await apiClient.get(`/held-sales/${id}`);return response.data.data;}
export async function createHeldSale(payload){const response=await apiClient.post("/held-sales",payload);return response.data;}
export async function updateHeldSale(id,payload){const response=await apiClient.put(`/held-sales/${id}`,payload);return response.data;}
export async function deleteHeldSale(id){const response=await apiClient.delete(`/held-sales/${id}`);return response.data;}
