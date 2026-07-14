import apiClient from "./apiClient";
const dataOf=(response)=>response.data.data;
export async function getExpenses(params={}){return dataOf(await apiClient.get("/expenses",{params}));}
export async function getExpenseSummary(params={}){return dataOf(await apiClient.get("/expenses/summary",{params}));}
export async function getExpense(id){return dataOf(await apiClient.get(`/expenses/${id}`)).expense;}
function formData(values){const body=new FormData();Object.entries(values).forEach(([key,value])=>{if(value!==null&&value!==undefined)body.append(key,value);});return body;}
export async function createExpense(values){return (await apiClient.post("/expenses",formData(values),{headers:{"Content-Type":undefined}})).data;}
export async function updateExpense(id,values){return (await apiClient.post(`/expenses/${id}`,formData(values),{headers:{"Content-Type":undefined,"X-HTTP-Method-Override":"PUT"}})).data;}
export async function voidExpense(id){return (await apiClient.delete(`/expenses/${id}`)).data;}
export async function exportExpenses(params={}){return apiClient.get("/expenses/export",{params,responseType:"blob"});}
export async function getExpenseCategories(search=""){return dataOf(await apiClient.get("/expense-categories",{params:search?{search}:{}})).categories;}
export async function createExpenseCategory(values){return (await apiClient.post("/expense-categories",values)).data;}
export async function updateExpenseCategory(id,values){return (await apiClient.put(`/expense-categories/${id}`,values)).data;}
export async function updateExpenseCategoryStatus(id,status){return (await apiClient.patch(`/expense-categories/${id}/status`,{status})).data;}
export async function deleteExpenseCategory(id){return (await apiClient.delete(`/expense-categories/${id}`)).data;}
export function receiptUrl(path){if(!path)return"";const base=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/api\/?$/,"");return `${base}/${path}`;}
