import apiClient from "./apiClient";

function dataOf(response) {
  return response.data.data;
}

export async function getBackups() {
  return dataOf(await apiClient.get("/backups"));
}

export async function createBackup() {
  return (await apiClient.post("/backups")).data;
}

export async function restoreBackup(filename, confirmation) {
  return (await apiClient.post("/backups/" + encodeURIComponent(filename) + "/restore", { confirmation })).data;
}

export async function downloadBackup(filename) {
  return apiClient.get("/backups/" + encodeURIComponent(filename) + "/download", { responseType: "blob" });
}