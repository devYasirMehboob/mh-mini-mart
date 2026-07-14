import apiClient from "./apiClient";
const data=r=>r.data.data;
export async function getSuppliers(params={}){return data(await apiClient.get("/suppliers",{params}));}
export async function getSupplierOptions(){return data(await apiClient.get("/suppliers/options")).suppliers;}
export async function getSupplier(id){return data(await apiClient.get(`/suppliers/${id}`));}
export async function createSupplier(values){return (await apiClient.post("/suppliers",values)).data;}
export async function updateSupplier(id,values){return (await apiClient.put(`/suppliers/${id}`,values)).data;}
export async function changeSupplierStatus(id,status){return (await apiClient.patch(`/suppliers/${id}/status`,{status})).data;}
export async function deleteSupplier(id){return (await apiClient.delete(`/suppliers/${id}`)).data;}
export async function getSupplierStatement(id,params={}){return data(await apiClient.get(`/suppliers/${id}/statement`,{params}));}
