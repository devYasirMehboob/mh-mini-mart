import { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import normalizeApiError from "../../utils/normalizeApiError";
import Icon from "../Icon";

function QuickAddPackagingUnitDialog({ isOpen, onClose, product, currentItem, units = [], onConfigured }) {
  const [form, setForm] = useState({
    unit_id: "",
    conversion_to_base: "1",
    is_purchase_unit: true,
    purchase_cost: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && product) {
      // The currently selected unit_id in the purchase row
      const activeUnitId = currentItem?.unit_id ? String(currentItem.unit_id) : "";

      // All configured units for this product (from product_units table)
      const purchaseUnits = currentItem?.purchase_units || product?.purchase_units || [];

      // Find existing configuration for the currently selected unit
      const existingUnit = activeUnitId
        ? purchaseUnits.find((u) => String(u.unit_id) === activeUnitId)
        : null;

      setForm({
        // Pre-select the current unit, else first unit in global list
        unit_id: activeUnitId || (units[0]?.id ? String(units[0].id) : ""),
        // Restore saved conversion factor (e.g. 50) — NOT hardcoded 1
        conversion_to_base: existingUnit
          ? String(existingUnit.conversion_to_base)
          : "1",
        is_purchase_unit: true,
        // Restore saved cost if available
        purchase_cost: existingUnit?.purchase_cost
          ? String(existingUnit.purchase_cost)
          : String(product.purchase_cost || ""),
      });
      setError("");
    }
  }, [isOpen, product, currentItem, units]);

  if (!isOpen || !product) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        unit_id: Number(form.unit_id),
        conversion_to_base: parseFloat(form.conversion_to_base || "1"),
        is_purchase_unit: 1,
        purchase_cost: form.purchase_cost ? String(form.purchase_cost) : null,
      };

      await apiClient.post(`/products/${product.id}/units`, payload);
      onConfigured(product.id);
      onClose();
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedUnitObj = units.find((u) => String(u.id) === String(form.unit_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="box" className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Configure Packaging Unit
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[250px]">
                {product.name}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <label className="block text-xs font-bold text-slate-700">
            Packaging Unit (e.g. Bori, Carton, Box)
            <select
              required
              value={form.unit_id}
              onChange={(e) => setForm((p) => ({ ...p, unit_id: e.target.value }))}
              className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select Packaging Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Conversion Factor (How many base units in 1 {selectedUnitObj?.name || "pack"}?)
            <input
              required
              type="number"
              step="0.001"
              min="0.001"
              value={form.conversion_to_base}
              onChange={(e) => setForm((p) => ({ ...p, conversion_to_base: e.target.value }))}
              placeholder="e.g. 50 (if 1 Bori = 50 kg)"
              className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Example: If 1 {selectedUnitObj?.name || "Bori"} contains 50 {product.base_unit_symbol || "kg"}, enter <strong>50</strong>.
            </p>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Default Cost per {selectedUnitObj?.name || "Pack"} (Optional)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_cost}
              onChange={(e) => setForm((p) => ({ ...p, purchase_cost: e.target.value }))}
              placeholder="e.g. 6900"
              className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>

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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {loading ? "Saving Unit..." : "Save Packaging Unit"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default QuickAddPackagingUnitDialog;
