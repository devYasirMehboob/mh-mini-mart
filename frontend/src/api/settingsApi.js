import apiClient from "./apiClient";
const dataOf = (response) => response.data.data;
export async function getPublicSettings(){return dataOf(await apiClient.get("/settings/public"));}
export async function getSettings(){return dataOf(await apiClient.get("/settings"));}
export async function updateSettings(settings){return (await apiClient.put("/settings",settings)).data;}
export async function uploadShopLogo(file){const body=new FormData();body.append("logo",file);return (await apiClient.post("/settings/logo",body,{headers:{"Content-Type":undefined}})).data;}
export async function removeShopLogo(){return (await apiClient.delete("/settings/logo")).data;}
