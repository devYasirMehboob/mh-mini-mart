import apiClient from "./apiClient";
export async function getPosProducts(params={},signal){const response=await apiClient.get("/pos/products",{params,signal});return response.data.data;}
export async function getPosCategories(){const response=await apiClient.get("/pos/categories");return response.data.data.categories;}
