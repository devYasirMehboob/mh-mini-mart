import { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import normalizeApiError from "../../utils/normalizeApiError";
import Icon from "../Icon";

function QuickAddProductDialog({ isOpen, onClose, onCreated, supplierId, initialName = "", categories = [], units = [] }) {
  const [form, setForm] = useState({
    name: initialName,
    category_id: "",
    product_code: "",
    barcode: "",
    purchase_cost: "0",
    selling_price: "0",
    quantity: "0",
    minimum_stock: "10",
    base_unit_id: "",
    default_purchase_unit_id: "",
    track_stock: true,
    track_batches: false,
    track_expiry: false,
    supplier_item_code: "",
    supplier_item_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...prev,
        name: initialName || prev.name,
        category_id: categories[0]?.id ? String(categories[0].id) : "",
        base_unit_id: units[0]?.id ? String(units[0].id) : "",
        default_purchase_unit_id: units[0]?.id ? String(units[0].id) : "",
      }));
      setErrors({});
    }
  }, [isOpen, initialName, categories, units]);

  if (!isOpen) return null;

  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = {
        ...form,
        supplier_id: supplierId || null,
        category_id: Number(form.category_id),
        base_unit_id: form.base_unit_id ? Number(form.base_unit_id) : null,
        default_purchase_unit_id: form.default_purchase_unit_id ? Number(form.default_purchase_unit_id) : null,
        purchase_cost: String(form.purchase_cost || "0"),
        selling_price: String(form.selling_price || "0"),
      };

      const res = await apiClient.post("/purchases/quick-add-product", payload);
      const createdProduct = res.data?.data?.product;
      if (createdProduct) {
        onCreated(createdProduct);
        onClose();
      }
    } catch (err) {
      const normalized = normalizeApiError(err);
      setErrors(normalized.fieldErrors || { general: normalized.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Icon name="plus" className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Quick Add Product to Master
              </h3>
              <p className="text-xs text-slate-500">
                Create a new canonical product without leaving Purchase entry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errors.general && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
              {errors.general}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Product Name *
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder="e.g. Cheeni (Sugar)"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
              {errors.name && <span className="text-[11px] font-medium text-red-600">{errors.name[0]}</span>}
            </label>

            <label className="text-xs font-bold text-slate-700">
              Category *
              <select
                required
                value={form.category_id}
                onChange={(e) => change("category_id", e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Product Code (auto-generates if empty)
              <input
                type="text"
                value={form.product_code}
                onChange={(e) => change("product_code", e.target.value)}
                placeholder="e.g. PRD-10203"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-xs font-bold text-slate-700">
              Barcode (optional)
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => change("barcode", e.target.value)}
                placeholder="Scan or enter barcode"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
              {errors.barcode && <span className="text-[11px] font-medium text-red-600">{errors.barcode[0]}</span>}
            </label>

            <label className="text-xs font-bold text-slate-700">
              Base Unit *
              <select
                required
                value={form.base_unit_id}
                onChange={(e) => change("base_unit_id", e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select Base Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Default Purchase Unit *
              <select
                required
                value={form.default_purchase_unit_id}
                onChange={(e) => change("default_purchase_unit_id", e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select Purchase Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Est. Purchase Cost (per purchase unit)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_cost}
                onChange={(e) => change("purchase_cost", e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-xs font-bold text-slate-700">
              Est. Selling Price (per sale unit)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={(e) => change("selling_price", e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              Supplier Item Code (Optional mapping)
              <input
                type="text"
                value={form.supplier_item_code}
                onChange={(e) => change("supplier_item_code", e.target.value)}
                placeholder="e.g. WS-50 (Supplier's item code)"
                className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.track_stock}
                onChange={(e) => change("track_stock", e.target.checked)}
                className="size-4 rounded text-blue-600"
              />
              Track Stock Quantity
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.track_batches}
                onChange={(e) => change("track_batches", e.target.checked)}
                className="size-4 rounded text-blue-600"
              />
              Track Batches
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.track_expiry}
                onChange={(e) => change("track_expiry", e.target.checked)}
                className="size-4 rounded text-blue-600"
              />
              Track Expiry Date
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              {loading ? "Creating Product..." : "Create Product & Add to Purchase"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default QuickAddProductDialog;
