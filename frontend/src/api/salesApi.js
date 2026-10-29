import apiClient from "./apiClient";

export async function completeSale(payload) {
  // If running in Desktop App and server cannot be reached, record directly into local SQLite
  if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
    try {
      const response = await apiClient.post("/sales", payload);
      return response.data;
    } catch (err) {
      if (!err.response && window.electronAPI?.recordSale) {
        const offlineSaleId = "desk_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
        const invoiceNum = "OFFLINE-" + offlineSaleId.slice(-6).toUpperCase();
        const now = new Date().toISOString();

        await window.electronAPI.recordSale({
          offline_sale_id: offlineSaleId,
          request_token: payload.request_token,
          invoice_number: invoiceNum,
          created_at: now,
          cashier_id: 1,
          cashier_name: "Cashier",
          customer_id: payload.customer_id || null,
          customer_name: payload.customer_name || null,
          customer_phone: payload.customer_phone || null,
          subtotal: payload.items.reduce((acc, i) => acc + (Number(i.unit_price) || 0) * Number(i.quantity), 0),
          discount_type: payload.discount_type || "none",
          discount_value: Number(payload.discount_value) || 0,
          discount_amount: 0,
          tax_amount: 0,
          grand_total: Number(payload.amount_received) || 0,
          amount_received: Number(payload.amount_received) || 0,
          change_returned: 0,
          payment_method: payload.payment_method || "cash",
          payment_status: "paid",
          notes: payload.notes || "",
          items: payload.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.name || "Item #" + i.product_id,
            product_code: i.code || "",
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price || 0),
            line_total: Number(i.unit_price || 0) * Number(i.quantity),
          })),
        });

        return {
          success: true,
          message: "Sale recorded locally in SQLite (will auto-sync when online).",
          data: {
            sale: {
              id: offlineSaleId,
              invoice_number: invoiceNum,
              status: "completed",
            },
            receipt: {
              sale: {
                id: offlineSaleId,
                invoice_number: invoiceNum,
                created_at: now,
                grand_total: payload.amount_received,
                payment_method: payload.payment_method || "cash",
              },
              items: payload.items,
            },
          },
        };
      }
      throw err;
    }
  }

  const response = await apiClient.post("/sales", payload);
  return response.data;
}

export async function getSales(params = {}) {
  const response = await apiClient.get("/sales", { params });
  return response.data.data;
}

export async function getSalesSummary(params = {}) {
  const response = await apiClient.get("/sales/summary", { params });
  return response.data.data;
}

export async function getSale(id) {
  const response = await apiClient.get(`/sales/${id}`);
  return response.data.data;
}

export async function getSaleReceipt(id) {
  const response = await apiClient.get(`/sales/${id}/receipt`);
  return response.data.data;
}

export async function cancelSale(id, reason) {
  const response = await apiClient.post(`/sales/${id}/cancel`, { reason });
  return response.data;
}

export async function refundSale(id, payload) {
  const response = await apiClient.post(`/sales/${id}/refund`, payload);
  return response.data;
}

export async function exportSales(params = {}) {
  return apiClient.get("/sales/export", { params, responseType: "blob" });
}
