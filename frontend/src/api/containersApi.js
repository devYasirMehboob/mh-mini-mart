import apiClient from "./apiClient";

/** Get all containers for a product */
export async function getProductContainers(productId) {
  const r = await apiClient.get(`/products/${productId}/containers`);
  return r.data;
}

/** Get a single container by ID */
export async function getContainer(containerId) {
  const r = await apiClient.get(`/containers/${containerId}`);
  return r.data;
}

/** Regenerate container barcode */
export async function regenerateContainerBarcode(containerId) {
  const r = await apiClient.post(`/containers/${containerId}/barcode/regenerate`);
  return r.data;
}

/** Update container barcode manually */
export async function updateContainerBarcode(containerId, barcode) {
  const r = await apiClient.put(`/containers/${containerId}/barcode`, { barcode });
  return r.data;
}

/** Get barcode preview SVG for a container */
export async function getContainerBarcodePreview(containerId) {
  const r = await apiClient.get(`/containers/${containerId}/barcode/preview`);
  return r.data;
}
