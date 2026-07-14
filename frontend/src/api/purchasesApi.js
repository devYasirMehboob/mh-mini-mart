import apiClient from "./apiClient";
const data=r=>r.data.data;
export async function getPurchases(params={}){return data(await apiClient.get("/purchases",{params}));}
export async function getPurchase(id){return data(await apiClient.get(`/purchases/${id}`));}
export async function createPurchase(values,draft=false){return (await apiClient.post(draft?"/purchases/drafts":"/purchases",values)).data;}
export async function updateDraftPurchase(id,values){return (await apiClient.put(`/purchases/${id}`,values)).data;}
export async function completeDraftPurchase(id,values){return (await apiClient.post(`/purchases/${id}/complete`,values)).data;}
export async function addPurchasePayment(id,values){return (await apiClient.post(`/purchases/${id}/payments`,values)).data;}
export async function cancelPurchase(id,reason){return (await apiClient.post(`/purchases/${id}/cancel`,{reason})).data;}
export async function getReturnableItems(id){return data(await apiClient.get(`/purchases/${id}/returnable-items`));}
export async function exportPurchases(params={}){return apiClient.get("/purchases/export",{params,responseType:"blob"});}
export async function getPurchaseReturns(params={}){return data(await apiClient.get("/purchase-returns",{params}));}
export async function getPurchaseReturn(id){return data(await apiClient.get(`/purchase-returns/${id}`));}
export async function createPurchaseReturn(values){return (await apiClient.post("/purchase-returns",values)).data;}
