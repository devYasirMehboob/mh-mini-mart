import apiClient from "./apiClient";

/** Get all presets for a product */
export async function getProductPresets(productId, includeInactive = false) {
  const params = includeInactive ? { include_inactive: "true" } : {};
  const r = await apiClient.get(`/products/${productId}/presets`, { params });
  return r.data;
}

/** Create a preset for a product */
export async function createProductPreset(productId, data) {
  const r = await apiClient.post(`/products/${productId}/presets`, data);
  return r.data;
}

/** Update a preset */
export async function updateProductPreset(productId, presetId, data) {
  const r = await apiClient.put(`/products/${productId}/presets/${presetId}`, data);
  return r.data;
}

/** Delete a preset */
export async function deleteProductPreset(productId, presetId) {
  const r = await apiClient.delete(`/products/${productId}/presets/${presetId}`);
  return r.data;
}

/** Regenerate barcode for a preset */
export async function regeneratePresetBarcode(productId, presetId) {
  const r = await apiClient.post(`/products/${productId}/presets/${presetId}/barcode/regenerate`);
  return r.data;
}

/** Get barcode preview SVG for a preset */
export async function getPresetBarcodePreview(productId, presetId) {
  const r = await apiClient.get(`/products/${productId}/presets/${presetId}/barcode/preview`);
  return r.data;
}

/** Resolve a barcode from POS (product, preset, or container) */
export async function resolvePosBarcode(barcode) {
  const r = await apiClient.get(`/pos/barcodes/${encodeURIComponent(barcode)}`);
  return r.data;
}
